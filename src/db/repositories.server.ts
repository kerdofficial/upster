import { randomUUID } from "node:crypto"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db, ensureDatabase } from "@/db/client.server"
import {
  cloudflareTunnels,
  events,
  pillCommands,
  pillPorts,
  pillRuns,
  pills,
  runLogs,
  secretVaults,
} from "@/db/schema"
import type {
  CloudflareTunnel,
  CreatePillInput,
  Pill,
  PillCommand,
  PillDetail,
  PillListItem,
  PillPorts,
  PillRun,
  PillStatus,
  RunLog,
  UpdatePillInput,
} from "@/features/pills/types"

function now() {
  return new Date().toISOString()
}

function parseCommand(row: typeof pillCommands.$inferSelect): PillCommand {
  return {
    id: row.id,
    pillId: row.pillId,
    name: row.name,
    cwd: row.cwd,
    argv: JSON.parse(row.argvJson) as Array<string>,
    env: JSON.parse(row.envJson) as Record<string, string>,
    healthcheckPath: row.healthcheckPath,
  }
}

function parsePill(row: typeof pills.$inferSelect): Pill {
  return {
    ...row,
    status: row.status as PillStatus,
  }
}

function parseRun(row: typeof pillRuns.$inferSelect): PillRun {
  return {
    ...row,
    status: row.status as PillStatus,
  }
}

function parseTunnel(
  row: typeof cloudflareTunnels.$inferSelect
): CloudflareTunnel {
  return {
    ...row,
    configStatus: row.configStatus as CloudflareTunnel["configStatus"],
  }
}

function parseLog(row: typeof runLogs.$inferSelect): RunLog {
  return {
    id: row.id,
    runId: row.runId,
    stream: row.stream as RunLog["stream"],
    sequence: row.sequence,
    chunk: row.chunk,
    createdAt: row.createdAt,
  }
}

export async function createPillRecord(
  input: CreatePillInput & {
    slug: string
    argv: Array<string>
    repoPath: string
    cwd: string
  }
) {
  await ensureDatabase()

  const id = randomUUID()
  const createdAt = now()

  await db.insert(pills).values({
    id,
    name: input.name,
    slug: input.slug,
    repoPath: input.repoPath,
    defaultEnv: input.defaultEnv,
    status: "idle",
    createdAt,
    updatedAt: createdAt,
  })

  await db.insert(pillCommands).values({
    id: randomUUID(),
    pillId: id,
    name: input.commandName,
    cwd: input.cwd,
    argvJson: JSON.stringify(input.argv),
    envJson: JSON.stringify({ PORT: "$UPSTER_PORT" }),
    healthcheckPath: input.healthcheckPath ?? null,
  })

  return getPillDetail(id)
}

export async function listPills() {
  await ensureDatabase()

  const pillRows = await db.select().from(pills).orderBy(desc(pills.updatedAt))
  const portRows = await db.select().from(pillPorts)
  const tunnelRows = await db.select().from(cloudflareTunnels)
  const activeRunRows = await db
    .select()
    .from(pillRuns)
    .where(isNull(pillRuns.stoppedAt))
    .orderBy(desc(pillRuns.startedAt))

  return pillRows.map<PillListItem>((pillRow) => {
    const ports = portRows.find((row) => row.pillId === pillRow.id)
    const tunnel = tunnelRows.find((row) => row.pillId === pillRow.id)
    const activeRun = activeRunRows.find((row) => row.pillId === pillRow.id)

    return {
      ...parsePill(pillRow),
      appPort: ports?.appPort ?? null,
      metricsPort: ports?.metricsPort ?? null,
      hostname: tunnel?.hostname ?? null,
      activeRun: activeRun ? parseRun(activeRun) : null,
    }
  })
}

export async function getPillDetail(pillId: string): Promise<PillDetail> {
  await ensureDatabase()

  const [pillRow] = await db.select().from(pills).where(eq(pills.id, pillId))

  if (!pillRow) {
    throw new Error("Pill not found.")
  }

  const [ports] = await db
    .select()
    .from(pillPorts)
    .where(eq(pillPorts.pillId, pillId))
  const [tunnel] = await db
    .select()
    .from(cloudflareTunnels)
    .where(eq(cloudflareTunnels.pillId, pillId))
  const [activeRun] = await db
    .select()
    .from(pillRuns)
    .where(and(eq(pillRuns.pillId, pillId), isNull(pillRuns.stoppedAt)))
    .orderBy(desc(pillRuns.startedAt))
  const commandRows = await db
    .select()
    .from(pillCommands)
    .where(eq(pillCommands.pillId, pillId))
  const logRows = activeRun
    ? await db
        .select()
        .from(runLogs)
        .where(eq(runLogs.runId, activeRun.id))
        .orderBy(desc(runLogs.sequence))
        .limit(200)
    : []

  return {
    ...parsePill(pillRow),
    appPort: ports?.appPort ?? null,
    metricsPort: ports?.metricsPort ?? null,
    hostname: tunnel?.hostname ?? null,
    activeRun: activeRun ? parseRun(activeRun) : null,
    commands: commandRows.map(parseCommand),
    tunnel: tunnel ? parseTunnel(tunnel) : null,
    recentLogs: logRows.reverse().map(parseLog),
  }
}

export async function updatePillRecord(input: UpdatePillInput) {
  await ensureDatabase()

  await db
    .update(pills)
    .set({
      name: input.name,
      defaultEnv: input.defaultEnv,
      updatedAt: now(),
    })
    .where(eq(pills.id, input.pillId))

  return getPillDetail(input.pillId)
}

export async function deletePillRecord(pillId: string) {
  await ensureDatabase()
  await db.delete(pills).where(eq(pills.id, pillId))
}

export async function updatePillStatus(pillId: string, status: PillStatus) {
  await ensureDatabase()
  await db
    .update(pills)
    .set({ status, updatedAt: now() })
    .where(eq(pills.id, pillId))
}

export async function getPillCommand(pillId: string, commandName: string) {
  await ensureDatabase()

  const [row] = await db
    .select()
    .from(pillCommands)
    .where(
      and(eq(pillCommands.pillId, pillId), eq(pillCommands.name, commandName))
    )

  if (!row) {
    throw new Error("Pill command not found.")
  }

  return parseCommand(row)
}

export async function upsertPillPorts(ports: PillPorts) {
  await ensureDatabase()
  await db
    .insert(pillPorts)
    .values(ports)
    .onConflictDoUpdate({
      target: pillPorts.pillId,
      set: {
        appPort: ports.appPort,
        metricsPort: ports.metricsPort,
        lastCheckedAt: ports.lastCheckedAt,
        rotationCount: ports.rotationCount,
      },
    })
}

export async function getPillPorts(pillId: string) {
  await ensureDatabase()
  const [row] = await db
    .select()
    .from(pillPorts)
    .where(eq(pillPorts.pillId, pillId))

  return row ?? null
}

export async function upsertTunnel(tunnel: CloudflareTunnel) {
  await ensureDatabase()
  await db.insert(cloudflareTunnels).values(tunnel).onConflictDoUpdate({
    target: cloudflareTunnels.pillId,
    set: tunnel,
  })
}

export async function createRun(run: Omit<PillRun, "id" | "startedAt">) {
  await ensureDatabase()

  const record: PillRun = {
    ...run,
    id: randomUUID(),
    startedAt: now(),
  }

  await db.insert(pillRuns).values(record)
  return record
}

export async function updateRun(runId: string, patch: Partial<PillRun>) {
  await ensureDatabase()
  await db.update(pillRuns).set(patch).where(eq(pillRuns.id, runId))
}

export async function getRun(runId: string) {
  await ensureDatabase()
  const [row] = await db.select().from(pillRuns).where(eq(pillRuns.id, runId))

  return row ? parseRun(row) : null
}

export async function getActiveRun(pillId: string) {
  await ensureDatabase()
  const [row] = await db
    .select()
    .from(pillRuns)
    .where(and(eq(pillRuns.pillId, pillId), isNull(pillRuns.stoppedAt)))
    .orderBy(desc(pillRuns.startedAt))

  return row ? parseRun(row) : null
}

export async function appendRunLog(log: Omit<RunLog, "id" | "createdAt">) {
  await ensureDatabase()

  const record: RunLog = {
    ...log,
    id: randomUUID(),
    createdAt: now(),
  }

  await db.insert(runLogs).values(record)
  return record
}

export async function getRunLogs(runId: string) {
  await ensureDatabase()
  const rows = await db
    .select()
    .from(runLogs)
    .where(eq(runLogs.runId, runId))
    .orderBy(desc(runLogs.sequence))
    .limit(300)

  return rows.reverse().map(parseLog)
}

export async function saveSecretVault(input: {
  name: string
  ciphertext: string
  salt: string
  nonce: string
  kdf: string
  version: number
}) {
  await ensureDatabase()

  const updatedAt = now()

  await db
    .insert(secretVaults)
    .values({
      id: input.name,
      ...input,
      createdAt: updatedAt,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: secretVaults.id,
      set: {
        ciphertext: input.ciphertext,
        salt: input.salt,
        nonce: input.nonce,
        kdf: input.kdf,
        version: input.version,
        updatedAt,
      },
    })
}

export async function getSecretVault(name: string) {
  await ensureDatabase()
  const [row] = await db
    .select()
    .from(secretVaults)
    .where(eq(secretVaults.id, name))

  return row ?? null
}

export async function appendEvent(input: {
  type: string
  pillId?: string
  runId?: string
  message: string
  metadata?: Record<string, unknown>
}) {
  await ensureDatabase()
  await db.insert(events).values({
    id: randomUUID(),
    type: input.type,
    pillId: input.pillId ?? null,
    runId: input.runId ?? null,
    message: input.message,
    metadataJson: JSON.stringify(input.metadata ?? {}),
    createdAt: now(),
  })
}
