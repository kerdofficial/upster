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

function errorResponse(message: string) {
  return new Response(
    JSON.stringify({
      success: false,
      errors: [{ code: 1000, message }],
      result: null,
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  )
}

describe("CloudflareClient", () => {
  it("creates and configures a tunnel through the API", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
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
    const tunnel = await client.getOrCreateRemoteTunnel("upster-example")
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
    expect(fetcher).toHaveBeenCalledTimes(6)
  })

  it("reuses an existing tunnel when Cloudflare reports a duplicate name", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        errorResponse(
          "You already have a tunnel with this name. Delete the existing tunnel, or choose a different name for your new tunnel"
        )
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: "existing-tunnel-id", name: "upster-example" }])
      )

    const client = new CloudflareClient(config, fetcher)
    const tunnel = await client.getOrCreateRemoteTunnel("upster-example")

    expect(tunnel.id).toBe("existing-tunnel-id")
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
