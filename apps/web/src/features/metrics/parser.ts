export type ParsedMetrics = {
  haConnections: number | null
  activeStreams: number | null
  totalRequests: number | null
}

function readMetric(raw: string, names: Array<string>) {
  for (const name of names) {
    const line = raw
      .split("\n")
      .find((candidate) => candidate.startsWith(`${name} `))

    if (line) {
      const value = Number(line.split(/\s+/)[1])
      return Number.isFinite(value) ? value : null
    }
  }

  return null
}

export function parseCloudflaredMetrics(raw: string): ParsedMetrics {
  return {
    haConnections: readMetric(raw, [
      "cloudflared_tunnel_ha_connections",
      "cloudflared_tunnel_active_ha_connections",
    ]),
    activeStreams: readMetric(raw, [
      "cloudflared_tunnel_active_streams",
      "cloudflared_tunnel_concurrent_requests_per_tunnel",
    ]),
    totalRequests: readMetric(raw, [
      "cloudflared_tunnel_total_requests",
      "cloudflared_tunnel_request_count",
    ]),
  }
}
