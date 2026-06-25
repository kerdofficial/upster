"use client"

import { createContext, useContext, useMemo, useState } from "react"

import type { CloudflareConfig } from "@/features/pills/types"

type CloudflareVaultContextValue = {
  config: CloudflareConfig | null
  isUnlocked: boolean
  unlock: (config: CloudflareConfig) => void
  lock: () => void
}

const CloudflareVaultContext =
  createContext<CloudflareVaultContextValue | null>(null)

export function CloudflareVaultProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [config, setConfig] = useState<CloudflareConfig | null>(null)
  const value = useMemo<CloudflareVaultContextValue>(
    () => ({
      config,
      isUnlocked: Boolean(config),
      unlock: setConfig,
      lock: () => setConfig(null),
    }),
    [config]
  )

  return (
    <CloudflareVaultContext.Provider value={value}>
      {children}
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
