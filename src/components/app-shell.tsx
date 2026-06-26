import { Link, useRouterState } from "@tanstack/react-router"
import {
  CloudIcon,
  FolderKanbanIcon,
  RocketIcon,
  SettingsIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/features/auth/logout-button"
import { CloudflareLockButton } from "@/features/secrets/cloudflare-lock-button"

const UNAUTHENTICATED_PATHS = ["/login", "/setup"]

const navItems = [
  { to: "/", label: "Pills", icon: FolderKanbanIcon },
  { to: "/settings/cloudflare", label: "Cloudflare", icon: CloudIcon },
  { to: "/settings/runtime", label: "Runtime", icon: SettingsIcon },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (UNAUTHENTICATED_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <RocketIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Upster</div>
              <div className="truncate text-xs text-muted-foreground">
                Tunnel control
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.to

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton render={<Link to={item.to} />}>
                        <Icon data-icon="inline-start" />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto size-1.5 rounded-full bg-primary" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-center gap-2 px-2 py-1 text-center text-xs text-muted-foreground">
            <Badge variant="outline" className="w-fit">
              Alpha
            </Badge>
            <span>v{__APP_VERSION__}</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <CloudflareLockButton />
            <LogoutButton />
          </div>
        </header>
        <main className="min-h-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
