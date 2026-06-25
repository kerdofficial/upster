import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  assertValidHostnameLabel,
  ensureWorkspacePath,
  resolveWorkspacePath,
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

  it("translates host workspace paths to mounted container paths", () => {
    const hostRoot = mkdtempSync(join(tmpdir(), "upster-host-"))
    const containerRoot = mkdtempSync(join(tmpdir(), "upster-container-"))
    const containerProject = join(containerRoot, "apps", "sample")

    mkdirSync(containerProject, { recursive: true })

    try {
      expect(
        resolveWorkspacePath(
          join(hostRoot, "apps", "sample"),
          [containerRoot],
          hostRoot
        )
      ).toBe(containerProject)
      expect(
        ensureWorkspacePath(
          join(hostRoot, "apps", "sample"),
          [containerRoot],
          hostRoot
        )
      ).toBe(containerProject)
    } finally {
      rmSync(hostRoot, { recursive: true, force: true })
      rmSync(containerRoot, { recursive: true, force: true })
    }
  })
})
