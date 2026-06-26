import { getUpsterConfig } from "@/config/env.server"
import {
  createPillRecord,
  deletePillRecord,
  getActiveRun,
  getPillDetail,
  listPills,
  updatePillRecord,
} from "@/db/repositories.server"
import { createCloudflareClient } from "@/features/cloudflare/client.server"
import type {
  CloudflareConfig,
  CreatePillInput,
  UpdatePillInput,
} from "@/features/pills/types"
import {
  assertAllowedCommand,
  assertValidHostnameLabel,
  ensureWorkspacePath,
  parseCommand,
  slugify,
} from "@/features/pills/validation"

export async function createPill(input: CreatePillInput) {
  const config = getUpsterConfig()
  const name = input.name.trim()
  const slug = slugify(input.slug || name)

  assertValidHostnameLabel(slug)

  const repoPath = ensureWorkspacePath(
    input.repoPath,
    config.workspaceRoots,
    config.hostWorkspaceRoot
  )
  const cwd = ensureWorkspacePath(
    input.cwd || repoPath,
    config.workspaceRoots,
    config.hostWorkspaceRoot
  )
  const argv = parseCommand(input.command)

  assertAllowedCommand(argv, config.allowedCommands)

  return createPillRecord({
    ...input,
    name,
    slug,
    repoPath,
    cwd,
    argv,
  })
}

export async function updatePill(input: UpdatePillInput) {
  return updatePillRecord({
    ...input,
    name: input.name.trim(),
    defaultEnv: input.defaultEnv.trim(),
  })
}

export async function deletePill(input: {
  pillId: string
  cloudflareConfig?: CloudflareConfig
}) {
  const activeRun = await getActiveRun(input.pillId)

  if (activeRun) {
    throw new Error("Stop the pill before deleting it.")
  }

  if (input.cloudflareConfig) {
    await cleanupCloudflareResources(input.pillId, input.cloudflareConfig)
  }

  await deletePillRecord(input.pillId)
}

async function cleanupCloudflareResources(
  pillId: string,
  config: CloudflareConfig
) {
  const pill = await getPillDetail(pillId)

  if (!pill.tunnel) {
    return
  }

  const client = createCloudflareClient(config)

  if (pill.tunnel.dnsRecordId) {
    try {
      await client.deleteDnsRecord(pill.tunnel.dnsRecordId)
    } catch {
      // Best effort: the record may already be gone.
    }
  }

  if (pill.tunnel.tunnelId) {
    try {
      await client.deleteTunnel(pill.tunnel.tunnelId)
    } catch {
      // Best effort: the tunnel may already be gone or still draining.
    }
  }
}

export async function getPills() {
  return listPills()
}

export async function getPillStatus(input: { pillId: string }) {
  return getPillDetail(input.pillId)
}

export function getRuntimeSettings() {
  const config = getUpsterConfig()

  return {
    workspaceRoots: config.workspaceRoots,
    hostWorkspaceRoot: config.hostWorkspaceRoot,
    allowedCommands: config.allowedCommands,
    appPortRange: config.appPortRange,
    metricsPortRange: config.metricsPortRange,
    publicOrigin: config.publicOrigin,
    cloudflaredBin: config.cloudflaredBin,
  }
}
