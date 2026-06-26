"use client"

import { useState } from "react"
import { useServerFn } from "@tanstack/react-start"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { CloudflareConfig } from "@/features/pills/types"
import { useCloudflareVault } from "@/features/secrets/cloudflare-vault-provider"
import type { getCloudflareVaultFn } from "@/features/secrets/secret.functions"
import {
  saveCloudflareVaultFn,
  validateCloudflareConfigFn,
} from "@/features/secrets/secret.functions"
import {
  decryptCloudflareVault,
  encryptCloudflareVault,
  type EncryptedVaultInput,
} from "@/features/secrets/vault"

type StoredVault = Awaited<ReturnType<typeof getCloudflareVaultFn>>

function toEncryptedVault(vault: StoredVault): EncryptedVaultInput | null {
  if (!vault) {
    return null
  }

  return {
    name: "cloudflare",
    ciphertext: vault.ciphertext,
    salt: vault.salt,
    nonce: vault.nonce,
    kdf: "argon2id",
    version: 1,
  }
}

export function CloudflareSettingsForm({ vault }: { vault: StoredVault }) {
  const saveVault = useServerFn(saveCloudflareVaultFn)
  const validateConfig = useServerFn(validateCloudflareConfigFn)
  const { config, isUnlocked, unlock, lock } = useCloudflareVault()
  const [pending, setPending] = useState(false)
  const encryptedVault = toEncryptedVault(vault)

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    const form = new FormData(event.currentTarget)
    const passphrase = String(form.get("passphrase") ?? "")
    const cloudflareConfig: CloudflareConfig = {
      accountId: String(form.get("accountId") ?? ""),
      zoneId: String(form.get("zoneId") ?? ""),
      rootDomain: String(form.get("rootDomain") ?? "").replace(
        /^https?:\/\//,
        ""
      ),
      apiToken: String(form.get("apiToken") ?? ""),
    }

    try {
      await validateConfig({ data: cloudflareConfig })
      const encrypted = await encryptCloudflareVault(
        cloudflareConfig,
        passphrase
      )
      await saveVault({ data: encrypted })
      unlock(cloudflareConfig)
      toast.success(
        "Cloudflare vault saved and unlocked for this browser session."
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save vault.")
    } finally {
      setPending(false)
    }
  }

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!encryptedVault) {
      toast.error("No Cloudflare vault has been saved yet.")
      return
    }

    setPending(true)

    const form = new FormData(event.currentTarget)
    const passphrase = String(form.get("unlockPassphrase") ?? "")

    try {
      const cloudflareConfig = await decryptCloudflareVault(
        encryptedVault,
        passphrase
      )
      await validateConfig({ data: cloudflareConfig })
      unlock(cloudflareConfig)
      toast.success("Cloudflare vault unlocked for this browser session.")
    } catch {
      toast.error("Could not unlock the vault with that passphrase.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-medium">Cloudflare settings</h1>
          <p className="text-sm text-muted-foreground">
            Save an encrypted local vault and unlock it only in browser memory.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Save vault</CardTitle>
            <CardDescription>
              The API token is validated, encrypted in the browser, then stored
              as ciphertext.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSave}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="accountId">Account ID</FieldLabel>
                  <Input id="accountId" name="accountId" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="zoneId">Zone ID</FieldLabel>
                  <Input id="zoneId" name="zoneId" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="rootDomain">Root domain</FieldLabel>
                  <Input
                    id="rootDomain"
                    name="rootDomain"
                    placeholder="example.com"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="apiToken">API token</FieldLabel>
                  <Input
                    id="apiToken"
                    name="apiToken"
                    type="password"
                    required
                  />
                  <FieldDescription>
                    Needs tunnel and DNS permissions for the selected zone.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="passphrase">Vault passphrase</FieldLabel>
                  <Input
                    id="passphrase"
                    name="passphrase"
                    type="password"
                    minLength={8}
                    required
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Validate and save vault"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <aside className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session unlock</CardTitle>
            <CardDescription>
              Unlocking stores plaintext config only in React memory.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Vault</div>
              <div className="mt-1 text-sm font-medium">
                {encryptedVault ? "saved" : "not saved"}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Session</div>
              <div className="mt-1 text-sm font-medium">
                {isUnlocked ? `unlocked for ${config?.rootDomain}` : "locked"}
              </div>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleUnlock}>
              <Field>
                <FieldLabel htmlFor="unlockPassphrase">Passphrase</FieldLabel>
                <Input
                  id="unlockPassphrase"
                  name="unlockPassphrase"
                  type="password"
                  disabled={!encryptedVault}
                />
              </Field>
              <Button type="submit" disabled={pending || !encryptedVault}>
                Unlock
              </Button>
            </form>
            <Button variant="outline" onClick={lock} disabled={!isUnlocked}>
              Lock session
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
