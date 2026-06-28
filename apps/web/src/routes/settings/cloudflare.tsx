import { createFileRoute } from "@tanstack/react-router"

import { CloudflareSettingsForm } from "@/features/secrets/cloudflare-settings-form"
import { getCloudflareVaultFn } from "@/features/secrets/secret.functions"

export const Route = createFileRoute("/settings/cloudflare")({
  loader: () => getCloudflareVaultFn(),
  component: CloudflareSettingsPage,
})

function CloudflareSettingsPage() {
  const vault = Route.useLoaderData()

  return <CloudflareSettingsForm vault={vault} />
}
