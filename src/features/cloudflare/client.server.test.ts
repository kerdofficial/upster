import { describe, expect, it, vi } from "vitest"

import { CloudflareClient } from "@/features/cloudflare/client.server"

const config = {
  accountId: "account",
  zoneId: "zone",
  rootDomain: "example.com",
  apiToken: "token",
}

function jsonResponse(result: unknown) {
  return new Response(JSON.stringify({ success: true, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

describe("CloudflareClient", () => {
  it("creates and configures a tunnel through the API", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ id: "tunnel-id", name: "upster-example" })
      )
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "dns-id",
          name: "sample.example.com",
          content: "tunnel-id.cfargotunnel.com",
        })
      )
      .mockResolvedValueOnce(jsonResponse("runtime-token"))

    const client = new CloudflareClient(config, fetcher)
    const tunnel = await client.createRemoteTunnel("upster-example")
    await client.updateTunnelConfig({
      tunnelId: tunnel.id,
      hostname: "sample.example.com",
      appPort: 41000,
    })
    const record = await client.ensureDnsRecord({
      hostname: "sample.example.com",
      tunnelId: tunnel.id,
    })
    const token = await client.fetchTunnelToken(tunnel.id)

    expect(tunnel.id).toBe("tunnel-id")
    expect(record.id).toBe("dns-id")
    expect(token).toBe("runtime-token")
    expect(fetcher).toHaveBeenCalledTimes(5)
  })
})
