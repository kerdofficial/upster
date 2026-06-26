"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

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
  const lastErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setMetrics(null)
      return
    }

    let cancelled = false

    async function loadMetrics() {
      let data: MetricsResponse

      try {
        const response = await fetch(`/api/runs/${runId}/metrics`)
        data = (await response.json()) as MetricsResponse
      } catch {
        data = { error: "Failed to load metrics." }
      }

      if (!cancelled) {
        setMetrics(data)

        if ("error" in data && data.error !== lastErrorRef.current) {
          lastErrorRef.current = data.error
          toast.error(data.error)
        }

        if (!("error" in data)) {
          lastErrorRef.current = null
        }
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
          <p className="text-xs text-muted-foreground">
            Metrics are not available for this run.
          </p>
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
