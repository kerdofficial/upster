import { Badge } from "@/components/ui/badge"
import type { PillStatus } from "@/features/pills/types"

const variants: Record<
  PillStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  idle: "outline",
  starting: "secondary",
  running: "default",
  stopping: "secondary",
  error: "destructive",
  expired: "outline",
}

export function StatusBadge({ status }: { status: PillStatus }) {
  return <Badge variant={variants[status]}>{status}</Badge>
}
