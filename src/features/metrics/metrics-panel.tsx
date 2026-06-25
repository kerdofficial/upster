"use client"

import { useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ParsedMetrics } from "@/features/metrics/parser"

type MetricsResponse =
  | { raw: string; parsed: ParsedMetrics }
  | { error: string }

export function MetricsPanel({ runId }: { runId: string | null }) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)

  useEffect(() => {
    if (!runId) {
      setMetrics(null)
      return
    }

    let cancelled = false

    async function loadMetrics() {
      const response = await fetch(`/api/runs/${runId}/metrics`)
      const data = (await response.json()) as MetricsResponse

      if (!cancelled) {
        setMetrics(data)
      }
    }

    void loadMetrics()
    const timer = setInterval(() => void loadMetrics(), 5000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [runId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>cloudflared metrics</CardTitle>
        <CardDescription>
          Prometheus output from the local metrics server.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!runId && (
          <p className="text-xs text-muted-foreground">No active run.</p>
        )}
        {runId && !metrics && <Skeleton className="h-28 w-full" />}
        {metrics && "error" in metrics && (
          <p className="text-xs text-destructive">{metrics.error}</p>
        )}
        {metrics && !("error" in metrics) && (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              <Metric
                label="HA connections"
                value={metrics.parsed.haConnections}
              />
              <Metric
                label="Active streams"
                value={metrics.parsed.activeStreams}
              />
              <Metric
                label="Total requests"
                value={metrics.parsed.totalRequests}
              />
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {metrics.raw}
            </pre>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-medium">{value ?? "-"}</div>
    </div>
  )
}
