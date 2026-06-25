import { getRun, getPillDetail } from "@/db/repositories.server"
import { parseCloudflaredMetrics } from "@/features/metrics/parser"

export async function getRunMetrics(runId: string) {
  const run = await getRun(runId)

  if (!run) {
    throw new Error("Run not found.")
  }

  const pill = await getPillDetail(run.pillId)

  if (!pill.metricsPort) {
    throw new Error("Run has no metrics port.")
  }

  const response = await fetch(`http://127.0.0.1:${pill.metricsPort}/metrics`)

  if (!response.ok) {
    throw new Error("cloudflared metrics endpoint is not available.")
  }

  const raw = await response.text()

  return {
    raw,
    parsed: parseCloudflaredMetrics(raw),
  }
}
