import { createMiddleware } from "@tanstack/react-start"

import { requireSession } from "@/features/auth/auth.server"

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await requireSession()
    return next({ context: { session } })
  }
)
