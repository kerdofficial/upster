import { existsSync } from "node:fs"
import { relative, resolve } from "node:path"

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

export function assertValidHostnameLabel(slug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    throw new Error(
      "Use a valid DNS label with lowercase letters, numbers, and hyphens."
    )
  }
}

export function ensureWorkspacePath(
  path: string,
  workspaceRoots: Array<string>
) {
  const resolvedPath = resolve(path)
  const allowed = workspaceRoots.some((root) => {
    const resolvedRoot = resolve(root)
    const distance = relative(resolvedRoot, resolvedPath)

    return (
      distance === "" ||
      (!distance.startsWith("..") && !resolve(distance).startsWith("/"))
    )
  })

  if (!allowed) {
    throw new Error("Path is outside the configured Upster workspace roots.")
  }

  if (!existsSync(resolvedPath)) {
    throw new Error("Path does not exist.")
  }

  return resolvedPath
}

export function parseCommand(command: string) {
  const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  const argv = parts.map((part) => part.replace(/^["']|["']$/g, ""))

  if (!argv.length) {
    throw new Error("Command cannot be empty.")
  }

  return argv
}
