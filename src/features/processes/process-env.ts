import type { PillCommand } from "@/features/pills/types"

const INHERITED_ENV_KEYS = ["PATH", "HOME", "LANG", "LC_ALL", "TZ", "TMPDIR"]

function renderEnvValue(value: string, port: number) {
  return value === "$UPSTER_PORT" ? String(port) : value
}

export function buildProcessEnv(
  command: PillCommand,
  port: number,
  baseEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const inherited = Object.fromEntries(
    INHERITED_ENV_KEYS.flatMap((key) => {
      const value = baseEnv[key]
      return value === undefined ? [] : [[key, value]]
    })
  )

  return {
    ...inherited,
    PORT: String(port),
    ...Object.fromEntries(
      Object.entries(command.env).map(([key, value]) => [
        key,
        renderEnvValue(value, port),
      ])
    ),
  }
}
