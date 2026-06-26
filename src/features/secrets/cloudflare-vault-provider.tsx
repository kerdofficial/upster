"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { CloudflareConfig } from "@/features/pills/types"
import {
  getCloudflareVaultFn,
  validateCloudflareConfigFn,
} from "@/features/secrets/secret.functions"
import {
  decryptCloudflareVault,
  type EncryptedVaultInput,
} from "@/features/secrets/vault"

type StoredVault = Awaited<ReturnType<typeof getCloudflareVaultFn>> | null

type UnlockRequest = {
  onUnlocked?: (config: CloudflareConfig) => void
} | null

export function toEncryptedVault(
  vault: StoredVault
): EncryptedVaultInput | null {
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

type CloudflareVaultContextValue = {
  config: CloudflareConfig | null
  isUnlocked: boolean
  vault: StoredVault
  hasVault: boolean
  unlock: (config: CloudflareConfig) => void
  lock: () => void
  setVault: (vault: StoredVault) => void
  refreshVault: () => Promise<void>
  requestUnlock: (options?: {
    onUnlocked?: (config: CloudflareConfig) => void
  }) => void
}

const CloudflareVaultContext =
  createContext<CloudflareVaultContextValue | null>(null)

const UnlockRequestContext = createContext<{
  request: UnlockRequest
  close: () => void
} | null>(null)

export function CloudflareVaultProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const getVault = useServerFn(getCloudflareVaultFn)
  const [config, setConfig] = useState<CloudflareConfig | null>(null)
  const [vault, setVault] = useState<StoredVault>(null)
  const [request, setRequest] = useState<UnlockRequest>(null)

  const refreshVault = useCallback(async () => {
    setVault(await getVault())
  }, [getVault])

  useEffect(() => {
    void refreshVault()
  }, [refreshVault])

  const value = useMemo<CloudflareVaultContextValue>(
    () => ({
      config,
      isUnlocked: Boolean(config),
      vault,
      hasVault: Boolean(vault),
      unlock: setConfig,
      lock: () => setConfig(null),
      setVault,
      refreshVault,
      requestUnlock: (options) => setRequest(options ?? {}),
    }),
    [config, vault, refreshVault]
  )

  const requestValue = useMemo(
    () => ({ request, close: () => setRequest(null) }),
    [request]
  )

  return (
    <CloudflareVaultContext.Provider value={value}>
      <UnlockRequestContext.Provider value={requestValue}>
        {children}
        <CloudflareUnlockDialog />
      </UnlockRequestContext.Provider>
    </CloudflareVaultContext.Provider>
  )
}

export function useCloudflareVault() {
  const context = useContext(CloudflareVaultContext)

  if (!context) {
    throw new Error(
      "useCloudflareVault must be used inside CloudflareVaultProvider."
    )
  }

  return context
}

function CloudflareUnlockDialog() {
  const requestContext = useContext(UnlockRequestContext)
  const { vault, hasVault, unlock } = useCloudflareVault()
  const validateConfig = useServerFn(validateCloudflareConfigFn)
  const [pending, setPending] = useState(false)

  if (!requestContext) {
    return null
  }

  const { request, close } = requestContext
  const open = request !== null

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const encryptedVault = toEncryptedVault(vault)
    if (!encryptedVault) {
      toast.error("No Cloudflare vault has been saved yet.")
      return
    }

    setPending(true)
    const form = new FormData(event.currentTarget)
    const passphrase = String(form.get("passphrase") ?? "")
    const onUnlocked = request?.onUnlocked

    try {
      const config = await decryptCloudflareVault(encryptedVault, passphrase)
      await validateConfig({ data: config })
      unlock(config)
      toast.success("Cloudflare vault unlocked for this browser session.")
      close()
      onUnlocked?.(config)
    } catch {
      toast.error("Could not unlock the vault with that passphrase.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Cloudflare vault</DialogTitle>
          <DialogDescription>
            The passphrase decrypts your config into browser memory for this
            session only.
          </DialogDescription>
        </DialogHeader>
        {hasVault ? (
          <form className="flex flex-col gap-4" onSubmit={handleUnlock}>
            <Field>
              <FieldLabel htmlFor="globalUnlockPassphrase">
                Passphrase
              </FieldLabel>
              <Input
                id="globalUnlockPassphrase"
                name="passphrase"
                type="password"
                autoFocus
                required
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Unlocking..." : "Unlock"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              Save a Cloudflare vault before unlocking it.
            </p>
            <Button render={<Link to="/settings/cloudflare" />} onClick={close}>
              Go to Cloudflare settings
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
