import { createMiddleware } from "@tanstack/react-start"

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { requireSession } = await import("@/features/auth/auth.server")
    const session = await requireSession()
    return next({ context: { session } })
  }
)
