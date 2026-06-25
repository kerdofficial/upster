import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  assertValidHostnameLabel,
  ensureWorkspacePath,
  slugify,
} from "@/features/pills/validation"

describe("pill validation", () => {
  it("slugifies names for DNS labels", () => {
    expect(slugify("Example Dev App!")).toBe("example-dev-app")
  })

  it("rejects invalid hostname labels", () => {
    expect(() => assertValidHostnameLabel("-bad")).toThrow(/valid DNS label/)
  })

  it("rejects paths outside workspace roots", () => {
    const root = mkdtempSync(join(tmpdir(), "upster-root-"))
    const outside = mkdtempSync(join(tmpdir(), "upster-outside-"))

    try {
      expect(() => ensureWorkspacePath(outside, [root])).toThrow(
        /outside the configured/
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })
})
