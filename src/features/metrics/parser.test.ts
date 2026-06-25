import { describe, expect, it } from "vitest"

import { parseCloudflaredMetrics } from "@/features/metrics/parser"

describe("parseCloudflaredMetrics", () => {
  it("extracts core cloudflared counters", () => {
    const metrics = parseCloudflaredMetrics(`
cloudflared_tunnel_ha_connections 2
cloudflared_tunnel_active_streams 4
cloudflared_tunnel_total_requests 19
`)

    expect(metrics).toEqual({
      haConnections: 2,
      activeStreams: 4,
      totalRequests: 19,
    })
  })
})
