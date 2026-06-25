import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { getSecretVault, saveSecretVault } from "@/db/repositories.server"
import { CloudflareClient } from "@/features/cloudflare/client.server"

const encryptedVaultSchema = z.object({
  name: z.literal("cloudflare"),
  ciphertext: z.string().min(1),
  salt: z.string().min(1),
  nonce: z.string().min(1),
  kdf: z.literal("argon2id"),
  version: z.literal(1),
})

const cloudflareConfigSchema = z.object({
  accountId: z.string().min(1),
  zoneId: z.string().min(1),
  rootDomain: z.string().min(1),
  apiToken: z.string().min(1),
})

export const getCloudflareVaultFn = createServerFn({ method: "GET" }).handler(
  () => getSecretVault("cloudflare")
)

export const saveCloudflareVaultFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => encryptedVaultSchema.parse(data))
  .handler(async ({ data }) => {
    await saveSecretVault(data)
  })

export const validateCloudflareConfigFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => cloudflareConfigSchema.parse(data))
  .handler(async ({ data }) => {
    await new CloudflareClient(data).validateToken()
    return { ok: true }
  })
