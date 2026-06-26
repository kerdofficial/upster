import { existsSync } from "node:fs"
import { basename, isAbsolute, relative, resolve } from "node:path"

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
  workspaceRoots: Array<string>,
  hostWorkspaceRoot?: string | null
) {
  const resolvedPath = resolveWorkspacePath(
    path,
    workspaceRoots,
    hostWorkspaceRoot
  )
  const allowed = workspaceRoots.some((root) => {
    const resolvedRoot = resolve(root)
    const distance = relative(resolvedRoot, resolvedPath)

    return (
      distance === "" || (!distance.startsWith("..") && !isAbsolute(distance))
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

export function resolveWorkspacePath(
  path: string,
  workspaceRoots: Array<string>,
  hostWorkspaceRoot?: string | null
) {
  const resolvedPath = resolve(path)

  if (!hostWorkspaceRoot || !workspaceRoots.length) {
    return resolvedPath
  }

  const resolvedHostRoot = resolve(hostWorkspaceRoot)
  const distance = relative(resolvedHostRoot, resolvedPath)

  if (
    distance === "" ||
    (!distance.startsWith("..") && !isAbsolute(distance))
  ) {
    return resolve(workspaceRoots[0], distance)
  }

  return resolvedPath
}

export function assertAllowedCommand(
  argv: Array<string>,
  allowedCommands: Array<string>
) {
  if (!allowedCommands.length) {
    return
  }

  const executable = argv[0]
  const name = basename(executable)

  if (
    !allowedCommands.includes(executable) &&
    !allowedCommands.includes(name)
  ) {
    throw new Error(
      `Command "${name}" is not in the configured UPSTER_ALLOWED_COMMANDS list.`
    )
  }
}

export function parseCommand(command: string) {
  const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  const argv = parts.map((part) => part.replace(/^["']|["']$/g, ""))

  if (!argv.length) {
    throw new Error("Command cannot be empty.")
  }

  return argv
}
