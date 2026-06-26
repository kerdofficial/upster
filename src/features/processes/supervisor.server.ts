import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"

import {
  appendEvent,
  appendRunLog,
  createRun,
  getActiveRun,
  getPillCommand,
  getPillDetail,
  getPillPorts,
  updatePillStatus,
  updateRun,
  upsertPillPorts,
  upsertTunnel,
} from "@/db/repositories.server"
import { getUpsterConfig } from "@/config/env.server"
import { createCloudflareClient } from "@/features/cloudflare/client.server"
import type {
  CloudflareTunnel,
  PillCommand,
  PillRun,
  RunLog,
  StartPillInput,
} from "@/features/pills/types"
import { findAvailablePort } from "@/features/pills/ports.server"
import { emitRunLog, nextLogSequence } from "@/features/terminal/log-bus.server"

type ManagedRun = {
  runId: string
  pillId: string
  appProcess: ChildProcessWithoutNullStreams | null
  tunnelProcess: ChildProcessWithoutNullStreams | null
  expiryTimer: ReturnType<typeof setTimeout> | null
  stopping: boolean
}

const managedRuns = new Map<string, ManagedRun>()

function now() {
  return new Date().toISOString()
}

async function logRun(runId: string, stream: RunLog["stream"], chunk: string) {
  const log = await appendRunLog({
    runId,
    stream,
    sequence: nextLogSequence(runId),
    chunk,
  })
  emitRunLog(log)
}

function renderEnvValue(value: string, port: number) {
  return value === "$UPSTER_PORT" ? String(port) : value
}

function buildProcessEnv(command: PillCommand, port: number) {
  return {
    ...process.env,
    PORT: String(port),
    ...Object.fromEntries(
      Object.entries(command.env).map(([key, value]) => [
        key,
        renderEnvValue(value, port),
      ])
    ),
  }
}

async function preparePorts(pillId: string, rotatePorts: boolean) {
  const config = getUpsterConfig()
  const existing = await getPillPorts(pillId)
  const app = await findAvailablePort(
    config.appPortRange,
    rotatePorts ? null : existing?.appPort
  )
  const metrics = await findAvailablePort(
    config.metricsPortRange,
    rotatePorts ? null : existing?.metricsPort
  )
  const rotationCount =
    (existing?.rotationCount ?? 0) +
    (app.rotated || metrics.rotated || rotatePorts ? 1 : 0)

  await upsertPillPorts({
    pillId,
    appPort: app.port,
    metricsPort: metrics.port,
    lastCheckedAt: now(),
    rotationCount,
  })

  if (app.rotated || metrics.rotated || rotatePorts) {
    await appendEvent({
      type: "ports.rotated",
      pillId,
      message: "Rotated pill ports.",
      metadata: {
        appPort: app.port,
        metricsPort: metrics.port,
      },
    })
  }

  return {
    appPort: app.port,
    metricsPort: metrics.port,
  }
}

async function prepareCloudflareTunnel(input: {
  runId: string
  pillId: string
  appPort: number
  config: StartPillInput["cloudflareConfig"]
}) {
  const pill = await getPillDetail(input.pillId)
  const client = createCloudflareClient(input.config)
  const hostname = `${pill.slug}.${input.config.rootDomain}`
  const tunnelName = pill.tunnel?.tunnelName ?? `upster-${pill.slug}`

  await logRun(
    input.runId,
    "system",
    `Preparing Cloudflare tunnel ${hostname}\n`
  )

  const tunnel = pill.tunnel?.tunnelId
    ? { id: pill.tunnel.tunnelId, name: tunnelName }
    : await client.getOrCreateRemoteTunnel(tunnelName)

  await client.updateTunnelConfig({
    tunnelId: tunnel.id,
    hostname,
    appPort: input.appPort,
  })

  const dnsRecord = await client.ensureDnsRecord({
    hostname,
    tunnelId: tunnel.id,
    existingRecordId: pill.tunnel?.dnsRecordId,
  })
  const token = await client.fetchTunnelToken(tunnel.id)
  const record: CloudflareTunnel = {
    pillId: input.pillId,
    tunnelId: tunnel.id,
    tunnelName: tunnel.name,
    hostname,
    dnsRecordId: dnsRecord.id,
    configStatus: "synced",
  }

  await upsertTunnel(record)
  await logRun(
    input.runId,
    "system",
    `Cloudflare tunnel ready for ${hostname}\n`
  )

  return {
    token,
    tunnel: record,
  }
}

function spawnLoggedProcess(input: {
  runId: string
  command: string
  args: Array<string>
  cwd?: string
  env?: NodeJS.ProcessEnv
  streamName: string
}) {
  const child = spawn(input.command, input.args, {
    cwd: input.cwd,
    env: input.env,
    stdio: "pipe",
  })

  child.stdout.on("data", (chunk: Buffer) => {
    void logRun(input.runId, "stdout", chunk.toString())
  })
  child.stderr.on("data", (chunk: Buffer) => {
    void logRun(input.runId, "stderr", chunk.toString())
  })
  child.on("error", (error) => {
    void logRun(
      input.runId,
      "system",
      `${input.streamName} failed: ${error.message}\n`
    )
  })

  return child
}

function killProcess(child: ChildProcessWithoutNullStreams | null) {
  if (!child || child.killed) {
    return
  }

  child.kill("SIGTERM")
  setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGKILL")
    }
  }, 3000).unref()
}

function scheduleExpiry(run: PillRun, managed: ManagedRun) {
  if (!run.expiresAt) {
    return null
  }

  const delay = new Date(run.expiresAt).getTime() - Date.now()

  if (delay <= 0) {
    void stopPillRun({ pillId: run.pillId, runId: run.id, reason: "expired" })
    return null
  }

  return setTimeout(() => {
    void stopPillRun({
      pillId: managed.pillId,
      runId: managed.runId,
      reason: "expired",
    })
  }, delay)
}

export async function startPillRuntime(input: StartPillInput) {
  const activeRun = await getActiveRun(input.pillId)

  if (activeRun) {
    throw new Error("Pill already has an active run.")
  }

  const pill = await getPillDetail(input.pillId)
  const command = await getPillCommand(input.pillId, input.commandName)
  const ports = await preparePorts(input.pillId, input.rotatePorts ?? false)

  await updatePillStatus(input.pillId, "starting")

  const run = await createRun({
    pillId: input.pillId,
    commandName: input.commandName,
    appPid: null,
    tunnelPid: null,
    status: "starting",
    stoppedAt: null,
    expiresAt: input.expiresAt ?? null,
    exitCode: null,
    error: null,
  })

  const managed: ManagedRun = {
    runId: run.id,
    pillId: input.pillId,
    appProcess: null,
    tunnelProcess: null,
    expiryTimer: null,
    stopping: false,
  }
  managedRuns.set(run.id, managed)

  try {
    await logRun(
      run.id,
      "system",
      `Starting ${pill.name} on ${ports.appPort}\n`
    )

    const appProcess = spawnLoggedProcess({
      runId: run.id,
      command: command.argv[0],
      args: command.argv.slice(1),
      cwd: command.cwd,
      env: buildProcessEnv(command, ports.appPort),
      streamName: "App process",
    })

    managed.appProcess = appProcess
    await updateRun(run.id, { appPid: appProcess.pid ?? null })

    const { token } = await prepareCloudflareTunnel({
      runId: run.id,
      pillId: input.pillId,
      appPort: ports.appPort,
      config: input.cloudflareConfig,
    })

    const config = getUpsterConfig()
    const tunnelProcess = spawnLoggedProcess({
      runId: run.id,
      command: config.cloudflaredBin,
      args: [
        "tunnel",
        "--no-autoupdate",
        "--metrics",
        `127.0.0.1:${ports.metricsPort}`,
        "run",
        "--token",
        token,
      ],
      streamName: "cloudflared",
    })

    managed.tunnelProcess = tunnelProcess
    managed.expiryTimer = scheduleExpiry(run, managed)

    await updateRun(run.id, {
      tunnelPid: tunnelProcess.pid ?? null,
      status: "running",
    })
    await updatePillStatus(input.pillId, "running")

    appProcess.on("exit", (code) => {
      void handleAppExit(run.id, input.pillId, code)
    })
    tunnelProcess.on("exit", (code) => {
      void handleTunnelExit(run.id, input.pillId, code)
    })

    await appendEvent({
      type: "pill.started",
      pillId: input.pillId,
      runId: run.id,
      message: "Started pill run.",
      metadata: {
        appPort: ports.appPort,
        metricsPort: ports.metricsPort,
      },
    })

    return {
      ...run,
      appPid: appProcess.pid ?? null,
      tunnelPid: tunnelProcess.pid ?? null,
      status: "running" as const,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start pill."
    killProcess(managed.appProcess)
    killProcess(managed.tunnelProcess)
    managedRuns.delete(run.id)
    await logRun(run.id, "system", `${message}\n`)
    await updateRun(run.id, {
      status: "error",
      stoppedAt: now(),
      error: message,
    })
    await updatePillStatus(input.pillId, "error")
    throw error
  }
}

export async function stopPillRun(input: {
  pillId: string
  runId?: string
  reason?: "manual" | "expired" | "process-exit"
}) {
  const run = input.runId ? null : await getActiveRun(input.pillId)
  const runId = input.runId ?? run?.id

  if (!runId) {
    await updatePillStatus(input.pillId, "idle")
    return
  }

  const managed = managedRuns.get(runId)
  const status = input.reason === "expired" ? "expired" : "idle"

  if (managed) {
    managed.stopping = true
    if (managed.expiryTimer) {
      clearTimeout(managed.expiryTimer)
    }
    killProcess(managed.tunnelProcess)
    killProcess(managed.appProcess)
    managedRuns.delete(runId)
  }

  await logRun(runId, "system", `Stopped run: ${input.reason ?? "manual"}\n`)
  await updateRun(runId, {
    status,
    stoppedAt: now(),
  })
  await updatePillStatus(input.pillId, status)
  await appendEvent({
    type: "pill.stopped",
    pillId: input.pillId,
    runId,
    message: "Stopped pill run.",
    metadata: {
      reason: input.reason ?? "manual",
    },
  })
}

async function handleAppExit(
  runId: string,
  pillId: string,
  code: number | null
) {
  const managed = managedRuns.get(runId)

  if (!managed || managed.stopping) {
    return
  }

  await logRun(
    runId,
    "system",
    `App process exited with code ${code ?? "null"}\n`
  )
  killProcess(managed.tunnelProcess)
  managedRuns.delete(runId)
  await updateRun(runId, {
    status: code === 0 ? "idle" : "error",
    stoppedAt: now(),
    exitCode: code,
    error: code === 0 ? null : "App process exited unexpectedly.",
  })
  await updatePillStatus(pillId, code === 0 ? "idle" : "error")
}

async function handleTunnelExit(
  runId: string,
  pillId: string,
  code: number | null
) {
  const managed = managedRuns.get(runId)

  if (!managed || managed.stopping) {
    return
  }

  await logRun(
    runId,
    "system",
    `cloudflared exited with code ${code ?? "null"}\n`
  )
  await updateRun(runId, {
    status: "error",
    error: "cloudflared exited unexpectedly.",
  })
  await updatePillStatus(pillId, "error")
}
