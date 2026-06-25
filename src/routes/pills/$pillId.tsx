import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MetricsPanel } from "@/features/metrics/metrics-panel"
import { PillActions } from "@/features/pills/components/pill-actions"
import { StatusBadge } from "@/features/pills/components/status-badge"
import { getPillStatusFn } from "@/features/pills/pill.functions"
import { TerminalOutput } from "@/features/terminal/terminal-output"

export const Route = createFileRoute("/pills/$pillId")({
  loader: ({ params }) => getPillStatusFn({ data: { pillId: params.pillId } }),
  component: PillDetailPage,
})

function PillDetailPage() {
  const pill = Route.useLoaderData()
  const runId = pill.activeRun?.id ?? null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" render={<Link to="/" />}>
            <ArrowLeftIcon />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium">{pill.name}</h1>
              <StatusBadge status={pill.status} />
            </div>
            <p className="text-sm text-muted-foreground">{pill.repoPath}</p>
          </div>
        </div>
        <div className="w-full max-w-md">
          <PillActions pill={pill} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Terminal</CardTitle>
            <CardDescription>
              Live output from the app process and cloudflared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TerminalOutput runId={runId} initialLogs={pill.recentLogs} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Runtime</CardTitle>
              <CardDescription>
                Current tunnel and command profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Detail label="Hostname" value={pill.hostname ?? "-"} />
              <Detail label="App port" value={String(pill.appPort ?? "-")} />
              <Detail
                label="Metrics port"
                value={String(pill.metricsPort ?? "-")}
              />
              <Detail
                label="Tunnel"
                value={pill.tunnel?.tunnelName ?? "not created"}
              />
              <Separator />
              {pill.commands.map((command) => (
                <div key={command.id} className="flex flex-col gap-1">
                  <div className="font-medium">{command.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {command.argv.join(" ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    cwd {command.cwd}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <MetricsPanel runId={runId} />
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-xs font-medium">{value}</span>
    </div>
  )
}
