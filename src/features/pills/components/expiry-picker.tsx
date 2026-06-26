"use client"

import { useMemo, useState } from "react"
import { CalendarClockIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function formatLocalTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${hours}:${minutes}`
}

function parseIsoDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoString(date: Date | undefined, time: string) {
  if (!date) {
    return null
  }

  const [hoursRaw, minutesRaw] = time.split(":")
  const next = new Date(date)
  next.setHours(Number(hoursRaw ?? 23), Number(minutesRaw ?? 59), 0, 0)

  return next.toISOString()
}

export function ExpiryPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const parsedDate = useMemo(() => parseIsoDate(value), [value])
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState(() =>
    parsedDate ? formatLocalTime(parsedDate) : "23:59"
  )
  const label = parsedDate
    ? `${parsedDate.toLocaleDateString()} ${formatLocalTime(parsedDate)}`
    : "No expiry"

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-[12rem] justify-start"
              disabled={disabled}
            />
          }
        >
          <CalendarClockIcon data-icon="inline-start" />
          {label}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <FieldGroup className="gap-3">
            <Calendar
              mode="single"
              selected={parsedDate ?? undefined}
              disabled={{ before: new Date() }}
              onSelect={(date) => {
                onChange(toIsoString(date, time))
              }}
            />
            <Field>
              <FieldLabel htmlFor="expiry-time">Time</FieldLabel>
              <Input
                id="expiry-time"
                type="time"
                value={time}
                onChange={(event) => {
                  const nextTime = event.target.value
                  setTime(nextTime)
                  onChange(toIsoString(parsedDate ?? undefined, nextTime))
                }}
              />
            </Field>
          </FieldGroup>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Clear expiry"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
