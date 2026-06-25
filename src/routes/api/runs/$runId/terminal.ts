import { createFileRoute } from "@tanstack/react-router"

import { getRunLogs } from "@/db/repositories.server"
import { subscribeRunLogs } from "@/features/terminal/log-bus.server"

function formatSse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export const Route = createFileRoute("/api/runs/$runId/terminal")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const encoder = new TextEncoder()

        const stream = new ReadableStream({
          async start(controller) {
            const initialLogs = await getRunLogs(params.runId)

            for (const log of initialLogs) {
              controller.enqueue(encoder.encode(formatSse(log)))
            }

            const unsubscribe = subscribeRunLogs(params.runId, (log) => {
              controller.enqueue(encoder.encode(formatSse(log)))
            })

            request.signal.addEventListener("abort", () => {
              unsubscribe()
              controller.close()
            })
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      },
    },
  },
})
