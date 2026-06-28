"use client"

import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { logoutFn } from "@/features/auth/auth.functions"

export function LogoutButton() {
  const router = useRouter()
  const logout = useServerFn(logoutFn)
  const [pending, setPending] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          await logout({})
          await router.invalidate()
          await router.navigate({ to: "/login" })
        } catch {
          toast.error("Could not sign out.")
        } finally {
          setPending(false)
        }
      }}
    >
      <LogOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  )
}
