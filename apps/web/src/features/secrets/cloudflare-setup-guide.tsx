import { ExternalLinkIcon, HashIcon, KeyRoundIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TOKEN_PERMISSIONS = [
  {
    scope: "Account",
    name: "Cloudflare One Networks",
    why: "Routes tunnel traffic to your local app.",
    key: "teams_networks",
  },
  {
    scope: "Account",
    name: "Cloudflare One Connector: cloudflared",
    why: "Creates the tunnel and fetches its run token.",
    key: "teams_connector_cloudflared",
  },
  {
    scope: "Account",
    name: "Load Balancing: Monitors and Pools",
    why: "Required by the tunnel configuration API.",
    key: "load_balancing_monitors_and_pools",
  },
  {
    scope: "Zone",
    name: "DNS",
    why: "Points each pill hostname at its tunnel.",
    key: "dns",
  },
] as const

const TOKEN_TEMPLATE_URL = `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${encodeURIComponent(
  JSON.stringify(
    TOKEN_PERMISSIONS.map((permission) => ({
      key: permission.key,
      type: "edit",
    }))
  )
)}&accountId=*&zoneId=all&name=${encodeURIComponent(
  "Cloudflare Tunnel API Token via Upster"
)}`

const DASHBOARD_URL = "https://dash.cloudflare.com/"

export function CloudflareSetupGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Cloudflare</CardTitle>
        <CardDescription>
          Grab two things from Cloudflare, then paste them into the form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Section
          icon={KeyRoundIcon}
          title="API token"
          description="The prefilled page already has the right permissions selected."
        >
          <Button
            className="w-fit"
            render={
              <a href={TOKEN_TEMPLATE_URL} target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Create API token
          </Button>

          <div className="overflow-hidden rounded-lg border">
            {TOKEN_PERMISSIONS.map((permission, index) => (
              <div
                key={permission.name}
                className={cn(
                  "flex flex-col gap-0.5 px-3 py-2",
                  index > 0 && "border-t"
                )}
              >
                <span className="text-xs font-medium">
                  {permission.scope} &middot; {permission.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {permission.why}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Scope it to your account and your domain&apos;s zone. Client IP
            filtering and TTL are not needed.
          </p>
        </Section>

        <Section
          icon={HashIcon}
          title="Account ID and Zone ID"
          description="Both sit in the right sidebar of your domain's Overview page."
        >
          <Button
            variant="outline"
            className="w-fit"
            render={<a href={DASHBOARD_URL} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open dashboard
          </Button>
        </Section>
      </CardContent>
    </Card>
  )
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof KeyRoundIcon
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          <Icon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      {children}
    </div>
  )
}
