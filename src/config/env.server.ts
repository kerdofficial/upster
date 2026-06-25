import { mkdirSync } from "node:fs"
import { resolve } from "node:path"

export type PortRange = {
  min: number
  max: number
}

export type UpsterConfig = {
  dataDir: string
  databaseUrl: string
  hostWorkspaceRoot: string | null
  workspaceRoots: Array<string>
  appPortRange: PortRange
  metricsPortRange: PortRange
  publicOrigin: string
  cloudflaredBin: string
}

function parsePortRange(value: string | undefined, fallback: PortRange) {
  if (!value) {
    return fallback
  }

  const [minRaw, maxRaw] = value.split("-")
  const min = Number(minRaw)
  const max = Number(maxRaw)

  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min <= 0 ||
    max < min
  ) {
    return fallback
  }

  return { min, max }
}

function parseWorkspaceRoots(value: string | undefined) {
  const roots = (value ?? process.cwd())
    .split(",")
    .map((root) => root.trim())
    .filter(Boolean)
    .map((root) => resolve(root))

  return roots.length ? roots : [process.cwd()]
}

export function getUpsterConfig(): UpsterConfig {
  const dataDir = resolve(process.env.UPSTER_DATA_DIR ?? ".upster")
  const hostWorkspaceRoot = process.env.UPSTER_HOST_WORKSPACE?.trim()
  mkdirSync(dataDir, { recursive: true })

  return {
    dataDir,
    databaseUrl:
      process.env.DATABASE_URL ?? `file:${resolve(dataDir, "upster.db")}`,
    hostWorkspaceRoot: hostWorkspaceRoot ? resolve(hostWorkspaceRoot) : null,
    workspaceRoots: parseWorkspaceRoots(process.env.UPSTER_WORKSPACE_ROOTS),
    appPortRange: parsePortRange(process.env.UPSTER_APP_PORT_RANGE, {
      min: 41000,
      max: 49151,
    }),
    metricsPortRange: parsePortRange(process.env.UPSTER_METRICS_PORT_RANGE, {
      min: 52000,
      max: 60999,
    }),
    publicOrigin: process.env.UPSTER_PUBLIC_ORIGIN ?? "https://localhost:3377",
    cloudflaredBin: process.env.CLOUDFLARED_BIN ?? "cloudflared",
  }
}
