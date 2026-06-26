import { createFileRoute } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getRuntimeSettingsFn } from "@/features/pills/pill.functions"

export const Route = createFileRoute("/settings/runtime")({
  loader: () => getRuntimeSettingsFn(),
  component: RuntimeSettingsPage,
})

function RuntimeSettingsPage() {
  const settings = Route.useLoaderData()

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium">Runtime settings</h1>
        <p className="text-sm text-muted-foreground">
          Values read from the Docker environment and local process.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ports</CardTitle>
          <CardDescription>
            Pill app and metrics ports are checked and rotated on start.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Setting
            label="App port range"
            value={`${settings.appPortRange.min}-${settings.appPortRange.max}`}
          />
          <Setting
            label="Metrics port range"
            value={`${settings.metricsPortRange.min}-${settings.metricsPortRange.max}`}
          />
          <Setting label="Dashboard origin" value={settings.publicOrigin} />
          <Setting label="cloudflared binary" value={settings.cloudflaredBin} />
          <Setting
            label="Allowed commands"
            value={
              settings.allowedCommands.length
                ? settings.allowedCommands.join(", ")
                : "any (unrestricted)"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace mount</CardTitle>
          <CardDescription>
            Host paths are translated to container paths before validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {settings.hostWorkspaceRoot && (
            <Setting
              label="Host workspace root"
              value={settings.hostWorkspaceRoot}
            />
          )}
          {settings.workspaceRoots.map((root) => (
            <Setting key={root} label="Container workspace root" value={root} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium break-all">{value}</div>
    </div>
  )
}
