import { createServer } from "node:net"

import type { PortRange } from "@/config/env.server"

export async function isPortAvailable(port: number, host = "127.0.0.1") {
  return new Promise<boolean>((resolve) => {
    const server = createServer()

    server.once("error", () => resolve(false))
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

export function randomPort(range: PortRange) {
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
}

export async function findAvailablePort(
  range: PortRange,
  preferred?: number | null
) {
  if (preferred && (await isPortAvailable(preferred))) {
    return { port: preferred, rotated: false }
  }

  const maxAttempts = Math.min(250, range.max - range.min + 1)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = randomPort(range)

    if (await isPortAvailable(port)) {
      return { port, rotated: port !== preferred }
    }
  }

  throw new Error("No available port found in the configured range.")
}
