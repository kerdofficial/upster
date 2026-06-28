import { describe, expect, it } from "vitest"

import { buildProcessEnv } from "@/features/processes/process-env"
import type { PillCommand } from "@/features/pills/types"

function makeCommand(env: Record<string, string>): PillCommand {
  return {
    id: "cmd",
    pillId: "pill",
    name: "dev",
    cwd: "/workspaces/app",
    argv: ["bun", "run", "dev"],
    env,
    healthcheckPath: null,
  }
}

describe("buildProcessEnv", () => {
  it("does not leak dashboard secrets into the pill environment", () => {
    const baseEnv = {
      PATH: "/usr/bin",
      DATABASE_URL: "http://db:8080",
      UPSTER_SESSION_SECRET: "super-secret",
      CLOUDFLARED_BIN: "cloudflared",
    }

    const env = buildProcessEnv(makeCommand({}), 41000, baseEnv)

    expect(env.DATABASE_URL).toBeUndefined()
    expect(env.UPSTER_SESSION_SECRET).toBeUndefined()
    expect(env.CLOUDFLARED_BIN).toBeUndefined()
    expect(env.PATH).toBe("/usr/bin")
    expect(env.PORT).toBe("41000")
  })

  it("renders the port placeholder and keeps explicit pill env", () => {
    const env = buildProcessEnv(
      makeCommand({ PORT: "$UPSTER_PORT", API_BASE: "https://example.com" }),
      45000,
      { PATH: "/usr/bin" }
    )

    expect(env.PORT).toBe("45000")
    expect(env.API_BASE).toBe("https://example.com")
  })
})
