import { randomBytes } from "node:crypto"

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/setup/unlock-envelope")({
  server: {
    handlers: {
      POST: async () => {
        return Response.json({
          keyId: randomBytes(16).toString("hex"),
          publicKey: randomBytes(32).toString("base64"),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })
      },
    },
  },
})
