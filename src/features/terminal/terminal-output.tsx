"use client"

import { useEffect, useRef, useState } from "react"

import type { RunLog } from "@/features/pills/types"

export function TerminalOutput({
  runId,
  initialLogs,
}: {
  runId: string | null
  initialLogs: Array<RunLog>
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<{
    write: (data: string) => void
    dispose: () => void
  } | null>(null)
  const [plainLogs, setPlainLogs] = useState(initialLogs)
  const [ghosttyReady, setGhosttyReady] = useState(false)

  useEffect(() => {
    let disposed = false

    async function bootGhostty() {
      if (!containerRef.current) {
        return
      }

      try {
        const { init, Terminal, FitAddon } = await import("ghostty-web")
        await init()

        if (disposed || !containerRef.current) {
          return
        }

        const term = new Terminal({
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          theme: {
            background: "#09090b",
            foreground: "#fafafa",
          },
        })
        const fit = new FitAddon()
        term.loadAddon(fit)
        term.open(containerRef.current)
        fit.fit()
        initialLogs.forEach((log) => term.write(log.chunk))
        terminalRef.current = {
          write: (data) => term.write(data),
          dispose: () => term.dispose(),
        }
        setGhosttyReady(true)
      } catch {
        setGhosttyReady(false)
      }
    }

    void bootGhostty()

    return () => {
      disposed = true
      terminalRef.current?.dispose()
      terminalRef.current = null
    }
  }, [initialLogs])

  useEffect(() => {
    if (!runId) {
      return
    }

    const source = new EventSource(`/api/runs/${runId}/terminal`)

    source.onmessage = (event) => {
      const log = JSON.parse(event.data) as RunLog
      terminalRef.current?.write(log.chunk)
      setPlainLogs((current) => [...current, log].slice(-300))
    }

    return () => source.close()
  }, [runId])

  if (!runId) {
    return (
      <pre className="min-h-56 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        No active run.
      </pre>
    )
  }

  return (
    <div className="min-h-72 overflow-hidden rounded-lg bg-zinc-950">
      <div ref={containerRef} className="h-72 w-full" />
      {!ghosttyReady && (
        <pre className="h-72 overflow-auto p-3 text-xs text-zinc-100">
          {plainLogs.map((log) => log.chunk).join("")}
        </pre>
      )}
    </div>
  )
}
