import type { RunLog } from "@/features/pills/types"

type Listener = (log: RunLog) => void

const listeners = new Map<string, Set<Listener>>()
const sequences = new Map<string, number>()

export function nextLogSequence(runId: string) {
  const next = (sequences.get(runId) ?? 0) + 1
  sequences.set(runId, next)
  return next
}

export function emitRunLog(log: RunLog) {
  listeners.get(log.runId)?.forEach((listener) => listener(log))
}

export function subscribeRunLogs(runId: string, listener: Listener) {
  const runListeners = listeners.get(runId) ?? new Set<Listener>()
  runListeners.add(listener)
  listeners.set(runId, runListeners)

  return () => {
    runListeners.delete(listener)

    if (!runListeners.size) {
      listeners.delete(runId)
    }
  }
}
