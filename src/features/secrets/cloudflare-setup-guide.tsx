import { ExternalLinkIcon, ShieldCheckIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const TOKEN_PERMISSIONS = [
  {
    scope: "Account",
    name: "Cloudflare One Networks",
    why: "Registers the tunnel routes so requests reach your local app.",
    key: "teams_networks",
  },
  {
    scope: "Account",
    name: "Cloudflare One Connector: cloudflared",
    why: "Creates the tunnel, pushes its config, and fetches its run token.",
    key: "teams_connector_cloudflared",
  },
  {
    scope: "Account",
    name: "Load Balancing: Monitors and Pools",
    why: "Required by Cloudflare's remotely managed tunnel configuration API.",
    key: "load_balancing_monitors_and_pools",
  },
  {
    scope: "Zone",
    name: "DNS",
    why: "Creates and updates the CNAME record for each pill hostname.",
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
          Upster needs a Cloudflare API token to open per-pill tunnels and point
          DNS at them. Follow these steps once.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Step
          index={1}
          title="Create the API token"
          description="Open the prefilled token page. The required permissions are already selected."
        >
          <Button
            render={
              <a href={TOKEN_TEMPLATE_URL} target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Create API token on Cloudflare
          </Button>

          <ul className="flex flex-col gap-2">
            {TOKEN_PERMISSIONS.map((permission) => (
              <li
                key={permission.name}
                className="flex flex-col gap-0.5 rounded-md border p-2.5"
              >
                <span className="text-xs font-medium">
                  {permission.scope} &middot; {permission.name} &middot; Edit
                </span>
                <span className="text-xs text-muted-foreground">
                  {permission.why}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            Under <span className="font-medium">Account Resources</span> include
            your account, and under{" "}
            <span className="font-medium">Zone Resources</span> include the
            specific zone for your domain. You can leave Client IP Address
            Filtering and TTL untouched.
          </p>
        </Step>

        <Step
          index={2}
          title="Find your Account ID and Zone ID"
          description="Both are listed on your domain's Overview page in the Cloudflare dashboard."
        >
          <Button
            variant="outline"
            render={<a href={DASHBOARD_URL} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open Cloudflare dashboard
          </Button>
          <p className="text-xs text-muted-foreground">
            Pick your domain, then open{" "}
            <span className="font-medium">Overview</span>. The right sidebar
            shows the <span className="font-medium">Zone ID</span> and{" "}
            <span className="font-medium">Account ID</span>. The Account ID also
            appears in the dashboard URL after{" "}
            <span className="font-mono">dash.cloudflare.com/</span>.
          </p>
        </Step>

        <Alert>
          <ShieldCheckIcon />
          <AlertTitle>Your token stays encrypted</AlertTitle>
          <AlertDescription>
            Upster validates the token, then encrypts it in your browser with
            your vault passphrase (Argon2id + XChaCha20-Poly1305). Only the
            ciphertext is stored locally. The plaintext is used in memory only
            while validating or starting a tunnel, and is never persisted or
            written to logs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

function Step({
  index,
  title,
  description,
  children,
}: {
  index: number
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {index}
      </span>
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        {children}
      </div>
    </div>
  )
}
