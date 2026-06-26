import { getUpsterConfig } from "@/config/env.server"
import {
  createPillRecord,
  deletePillRecord,
  getActiveRun,
  getPillDetail,
  listPills,
  updatePillRecord,
} from "@/db/repositories.server"
import type { CreatePillInput, UpdatePillInput } from "@/features/pills/types"
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

export async function deletePill(input: { pillId: string }) {
  const activeRun = await getActiveRun(input.pillId)

  if (activeRun) {
    throw new Error("Stop the pill before deleting it.")
  }

  await deletePillRecord(input.pillId)
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
