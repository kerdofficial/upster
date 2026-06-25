"use client"

import { useState } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ExternalLinkIcon, RotateCwIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCloudflareVault } from "@/features/secrets/cloudflare-vault-provider"
import { startPillFn, stopPillFn } from "@/features/pills/pill.functions"
import type { PillListItem } from "@/features/pills/types"

export function PillActions({ pill }: { pill: PillListItem }) {
  const router = useRouter()
  const { config, isUnlocked } = useCloudflareVault()
  const startPill = useServerFn(startPillFn)
  const stopPill = useServerFn(stopPillFn)
  const [expiresAt, setExpiresAt] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isRunning = Boolean(pill.activeRun)

  return (
    <div className="flex flex-col gap-2">
      <FieldGroup className="gap-2">
        <Field>
          <FieldLabel htmlFor={`expires-${pill.id}`}>
            Optional expiry
          </FieldLabel>
          <Input
            id={`expires-${pill.id}`}
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            disabled={isRunning}
          />
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        {isRunning ? (
          <Button
            variant="destructive"
            onClick={async () => {
              setPending(true)
              setError(null)
              try {
                await stopPill({
                  data: {
                    pillId: pill.id,
                    runId: pill.activeRun?.id,
                  },
                })
                await router.invalidate()
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Failed to stop pill."
                )
              } finally {
                setPending(false)
              }
            }}
            disabled={pending}
          >
            <SquareIcon data-icon="inline-start" />
            Stop
          </Button>
        ) : (
          <Button
            onClick={async () => {
              if (!config) {
                setError("Unlock Cloudflare settings before starting a pill.")
                return
              }

              setPending(true)
              setError(null)
              try {
                await startPill({
                  data: {
                    pillId: pill.id,
                    commandName: pill.defaultEnv,
                    expiresAt: expiresAt
                      ? new Date(expiresAt).toISOString()
                      : undefined,
                    rotatePorts: false,
                    cloudflareConfig: config,
                  },
                })
                await router.invalidate()
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Failed to start pill."
                )
              } finally {
                setPending(false)
              }
            }}
            disabled={pending || !isUnlocked}
          >
            <RotateCwIcon data-icon="inline-start" />
            Start
          </Button>
        )}
        <Button
          variant="outline"
          render={<Link to="/pills/$pillId" params={{ pillId: pill.id }} />}
        >
          <ExternalLinkIcon data-icon="inline-start" />
          Details
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
