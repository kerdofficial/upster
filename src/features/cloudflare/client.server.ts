import type { CloudflareConfig } from "@/features/pills/types"

type CloudflareResult<T> = {
  success: boolean
  errors?: Array<{ code: number; message: string }>
  result: T
}

type TunnelResult = {
  id: string
  name: string
}

type DnsRecordResult = {
  id: string
  name: string
  content: string
  comment?: string | null
}

type FetchLike = typeof fetch

export const UPSTER_DNS_COMMENT = "managed-by-upster"

function isManagedByUpster(record: DnsRecordResult) {
  return record.comment === UPSTER_DNS_COMMENT
}

export class CloudflareClient {
  private readonly baseUrl = "https://api.cloudflare.com/client/v4"

  constructor(
    private readonly config: CloudflareConfig,
    private readonly fetcher: FetchLike = fetch
  ) {}

  async validateToken() {
    await this.request<{ id: string }>("/user/tokens/verify", {
      method: "GET",
    })
  }

  async createRemoteTunnel(name: string) {
    const result = await this.request<TunnelResult>(
      `/accounts/${this.config.accountId}/cfd_tunnel`,
      {
        method: "POST",
        body: JSON.stringify({ name, config_src: "cloudflare" }),
      }
    )

    return result
  }

  async findRemoteTunnelByName(name: string) {
    const params = new URLSearchParams({
      tunnel_name: name,
      is_deleted: "false",
    })
    const tunnels = await this.request<Array<TunnelResult>>(
      `/accounts/${this.config.accountId}/cfd_tunnel?${params.toString()}`,
      {
        method: "GET",
      }
    )

    return tunnels.find((tunnel) => tunnel.name === name) ?? null
  }

  async getOrCreateRemoteTunnel(name: string) {
    const existing = await this.findRemoteTunnelByName(name)

    if (existing) {
      return existing
    }

    try {
      return await this.createRemoteTunnel(name)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("You already have a tunnel with this name")
      ) {
        const tunnel = await this.findRemoteTunnelByName(name)

        if (tunnel) {
          return tunnel
        }
      }

      throw error
    }
  }

  async updateTunnelConfig(input: {
    tunnelId: string
    hostname: string
    appPort: number
  }) {
    await this.request<unknown>(
      `/accounts/${this.config.accountId}/cfd_tunnel/${input.tunnelId}/configurations`,
      {
        method: "PUT",
        body: JSON.stringify({
          config: {
            ingress: [
              {
                hostname: input.hostname,
                service: `http://127.0.0.1:${input.appPort}`,
              },
              {
                service: "http_status:404",
              },
            ],
          },
        }),
      }
    )
  }

  async ensureDnsRecord(input: {
    hostname: string
    tunnelId: string
    existingRecordId?: string | null
  }) {
    const content = `${input.tunnelId}.cfargotunnel.com`

    if (input.existingRecordId) {
      const current = await this.getDnsRecordById(input.existingRecordId)

      if (current) {
        if (!isManagedByUpster(current)) {
          throw new Error(
            `DNS record for ${input.hostname} already exists and is not managed by Upster. Refusing to overwrite it.`
          )
        }

        return this.updateDnsRecord({
          id: current.id,
          hostname: input.hostname,
          content,
        })
      }
    }

    const existing = await this.findDnsRecord(input.hostname)

    if (existing) {
      if (!isManagedByUpster(existing)) {
        throw new Error(
          `DNS record for ${input.hostname} already exists and is not managed by Upster. Refusing to overwrite it.`
        )
      }

      if (existing.content !== content) {
        return this.updateDnsRecord({
          id: existing.id,
          hostname: input.hostname,
          content,
        })
      }

      return existing
    }

    return this.request<DnsRecordResult>(
      `/zones/${this.config.zoneId}/dns_records`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "CNAME",
          name: input.hostname,
          content,
          proxied: true,
          comment: UPSTER_DNS_COMMENT,
        }),
      }
    )
  }

  async fetchTunnelToken(tunnelId: string) {
    return this.request<string>(
      `/accounts/${this.config.accountId}/cfd_tunnel/${tunnelId}/token`,
      {
        method: "GET",
      }
    )
  }

  async deleteDnsRecord(recordId: string) {
    await this.request<unknown>(
      `/zones/${this.config.zoneId}/dns_records/${recordId}`,
      {
        method: "DELETE",
      }
    )
  }

  async deleteTunnel(tunnelId: string) {
    await this.request<unknown>(
      `/accounts/${this.config.accountId}/cfd_tunnel/${tunnelId}`,
      {
        method: "DELETE",
      }
    )
  }

  private async getDnsRecordById(id: string) {
    try {
      return await this.request<DnsRecordResult>(
        `/zones/${this.config.zoneId}/dns_records/${id}`,
        {
          method: "GET",
        }
      )
    } catch {
      return null
    }
  }

  private async findDnsRecord(hostname: string) {
    const params = new URLSearchParams({
      type: "CNAME",
      name: hostname,
    })
    const records = await this.request<Array<DnsRecordResult>>(
      `/zones/${this.config.zoneId}/dns_records?${params.toString()}`,
      {
        method: "GET",
      }
    )

    return records[0] ?? null
  }

  private async updateDnsRecord(input: {
    id: string
    hostname: string
    content: string
  }) {
    return this.request<DnsRecordResult>(
      `/zones/${this.config.zoneId}/dns_records/${input.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          type: "CNAME",
          name: input.hostname,
          content: input.content,
          proxied: true,
          comment: UPSTER_DNS_COMMENT,
        }),
      }
    )
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    })

    const payload = (await response.json()) as CloudflareResult<T>

    if (!response.ok || !payload.success) {
      const message =
        payload.errors?.map((error) => error.message).join(", ") ||
        "Cloudflare request failed."

      throw new Error(message)
    }

    return payload.result
  }
}

export function createCloudflareClient(config: CloudflareConfig) {
  return new CloudflareClient(config)
}
