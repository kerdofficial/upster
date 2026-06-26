import { describe, expect, it } from "vitest"

import {
  createSessionToken,
  verifySessionToken,
} from "@/features/auth/session-token"

const secret = "test-secret"

describe("session token", () => {
  it("verifies a freshly signed token", () => {
    const token = createSessionToken("admin", secret)
    expect(verifySessionToken(token, secret)?.sub).toBe("admin")
  })

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("admin", secret)
    expect(verifySessionToken(token, "other-secret")).toBeNull()
  })

  it("rejects a tampered payload", () => {
    const token = createSessionToken("admin", secret)
    const [, signature] = token.split(".")
    const forgedBody = Buffer.from(
      JSON.stringify({ sub: "attacker", exp: 9999999999 })
    ).toString("base64url")

    expect(verifySessionToken(`${forgedBody}.${signature}`, secret)).toBeNull()
  })

  it("rejects an expired token", () => {
    const issuedAt = 1_000_000_000_000
    const token = createSessionToken("admin", secret, issuedAt)
    const wayLater = issuedAt + 1000 * 60 * 60 * 24 * 30

    expect(verifySessionToken(token, secret, wayLater)).toBeNull()
  })

  it("rejects malformed tokens", () => {
    expect(verifySessionToken(null, secret)).toBeNull()
    expect(verifySessionToken("not-a-token", secret)).toBeNull()
  })
})
