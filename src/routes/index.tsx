import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreatePillForm } from "@/features/pills/components/create-pill-form"
import { PillActions } from "@/features/pills/components/pill-actions"
import { StatusBadge } from "@/features/pills/components/status-badge"
import { listPillsFn } from "@/features/pills/pill.functions"
import { useCloudflareVault } from "@/features/secrets/cloudflare-vault-provider"

export const Route = createFileRoute("/")({
  loader: () => listPillsFn(),
  component: App,
})

function App() {
  const pills = Route.useLoaderData()
  const { isUnlocked } = useCloudflareVault()

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium">Upster pills</h1>
            <p className="text-sm text-muted-foreground">
              Publish mounted mini apps through per-pill Cloudflare tunnels.
            </p>
          </div>
          <Badge variant={isUnlocked ? "default" : "outline"}>
            Cloudflare {isUnlocked ? "unlocked" : "locked"}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Runs</CardTitle>
            <CardDescription>
              Start, stop, inspect ports, and jump into each active tunnel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pills.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pill</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pills.map((pill) => (
                    <TableRow key={pill.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            to="/pills/$pillId"
                            params={{ pillId: pill.id }}
                            className="font-medium hover:underline"
                          >
                            {pill.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {pill.repoPath}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={pill.status} />
                      </TableCell>
                      <TableCell>{pill.hostname ?? "-"}</TableCell>
                      <TableCell>
                        app {pill.appPort ?? "-"} / metrics{" "}
                        {pill.metricsPort ?? "-"}
                      </TableCell>
                      <TableCell>
                        <PillActions pill={pill} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PlusCircleIcon />
                  </EmptyMedia>
                  <EmptyTitle>No pills yet</EmptyTitle>
                  <EmptyDescription>
                    Add a mounted repo and Upster will manage its local port,
                    tunnel, logs, and metrics.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  Configure Cloudflare first if you want to start tunnels right
                  away.
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </section>

      <aside>
        <CreatePillForm />
      </aside>
    </div>
  )
}
