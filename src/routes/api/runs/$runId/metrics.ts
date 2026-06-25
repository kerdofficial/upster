import { createFileRoute } from "@tanstack/react-router"

import { getRunMetrics } from "@/features/metrics/metrics.server"

export const Route = createFileRoute("/api/runs/$runId/metrics")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return Response.json(await getRunMetrics(params.runId))
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Metrics unavailable."

          return Response.json({ error: message }, { status: 503 })
        }
      },
    },
  },
})
