import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PillStatus } from "@/features/pills/types"

const statusMeta: Record<
  PillStatus,
  { label: string; dot: string; pulse?: boolean }
> = {
  idle: { label: "Idle", dot: "bg-muted-foreground" },
  starting: { label: "Starting", dot: "bg-amber-500", pulse: true },
  running: { label: "Running", dot: "bg-emerald-500", pulse: true },
  stopping: { label: "Stopping", dot: "bg-amber-500", pulse: true },
  error: { label: "Error", dot: "bg-destructive" },
  expired: { label: "Expired", dot: "bg-muted-foreground" },
}

export function statusLabel(status: PillStatus) {
  return statusMeta[status].label
}

export function StatusBadge({ status }: { status: PillStatus }) {
  const meta = statusMeta[status]

  return (
    <Badge variant="outline" className="gap-1.5">
      <span
        className={cn(
          "size-1.5 rounded-full",
          meta.dot,
          meta.pulse && "animate-pulse"
        )}
      />
      {meta.label}
    </Badge>
  )
}
