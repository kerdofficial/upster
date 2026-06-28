import { createServer } from "node:net"
import { describe, expect, it } from "vitest"

import { findAvailablePort } from "@/features/pills/ports.server"

function listenOnRandomPort() {
  const server = createServer()

  return new Promise<{ port: number; close: () => Promise<void> }>(
    (resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()

        if (!address || typeof address === "string") {
          throw new Error("Expected TCP address.")
        }

        resolve({
          port: address.port,
          close: () =>
            new Promise<void>((closeResolve) =>
              server.close(() => closeResolve())
            ),
        })
      })
    }
  )
}

describe("findAvailablePort", () => {
  it("rotates when the preferred port is occupied", async () => {
    const occupied = await listenOnRandomPort()

    try {
      const result = await findAvailablePort(
        {
          min: occupied.port + 1,
          max: occupied.port + 100,
        },
        occupied.port
      )

      expect(result.rotated).toBe(true)
      expect(result.port).not.toBe(occupied.port)
    } finally {
      await occupied.close()
    }
  })
})
