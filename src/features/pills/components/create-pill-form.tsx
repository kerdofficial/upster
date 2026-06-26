"use client"

import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
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
import { createPillFn } from "@/features/pills/pill.functions"

export function CreatePillForm() {
  const router = useRouter()
  const createPill = useServerFn(createPillFn)
  const [pending, setPending] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Upster pill</CardTitle>
        <CardDescription>
          Add a mounted repo and the command Upster should run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setPending(true)

            const form = new FormData(event.currentTarget)

            try {
              await createPill({
                data: {
                  name: String(form.get("name") ?? ""),
                  slug: String(form.get("slug") ?? ""),
                  repoPath: String(form.get("repoPath") ?? ""),
                  defaultEnv: String(form.get("defaultEnv") ?? "dev"),
                  commandName: String(form.get("commandName") ?? "dev"),
                  command: String(form.get("command") ?? ""),
                  cwd: String(form.get("cwd") ?? ""),
                  healthcheckPath: String(form.get("healthcheckPath") ?? ""),
                },
              })
              event.currentTarget.reset()
              toast.success("Pill added.")
              await router.invalidate()
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to add pill."
              )
            } finally {
              setPending(false)
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="example-app" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">Subdomain slug</FieldLabel>
              <Input id="slug" name="slug" placeholder="example-app" />
              <FieldDescription>
                Leave empty to generate it from the pill name.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="repoPath">Repository path</FieldLabel>
              <Input
                id="repoPath"
                name="repoPath"
                placeholder="/workspaces/apps/example-app"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cwd">Command cwd</FieldLabel>
              <Input id="cwd" name="cwd" placeholder="defaults to repo path" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="defaultEnv">Default env</FieldLabel>
                <Input id="defaultEnv" name="defaultEnv" defaultValue="dev" />
              </Field>
              <Field>
                <FieldLabel htmlFor="commandName">Command profile</FieldLabel>
                <Input id="commandName" name="commandName" defaultValue="dev" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="command">Command</FieldLabel>
              <Input
                id="command"
                name="command"
                placeholder="bun run dev"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="healthcheckPath">
                Healthcheck path
              </FieldLabel>
              <Input
                id="healthcheckPath"
                name="healthcheckPath"
                placeholder="/"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add pill"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
