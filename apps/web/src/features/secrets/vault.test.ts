import { describe, expect, it } from "vitest"

import {
  decryptCloudflareVault,
  encryptCloudflareVault,
} from "@/features/secrets/vault"

const config = {
  accountId: "account",
  zoneId: "zone",
  rootDomain: "example.com",
  apiToken: "secret-token",
}

describe("cloudflare vault", () => {
  it("roundtrips encrypted config with the passphrase", async () => {
    const vault = await encryptCloudflareVault(config, "correct horse battery")

    await expect(
      decryptCloudflareVault(vault, "correct horse battery")
    ).resolves.toEqual(config)
  })

  it("rejects a wrong passphrase", async () => {
    const vault = await encryptCloudflareVault(config, "correct horse battery")

    await expect(
      decryptCloudflareVault(vault, "wrong passphrase")
    ).rejects.toThrow()
  })
})
