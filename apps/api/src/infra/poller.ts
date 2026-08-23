export type Tick = () => Promise<void>

export type Poller = {
  readonly kind: "sleep"
  every(intervalMs: number, tick: Tick): void
  stop(): void
}

/**
 * One async loop for the process lifetime. `every` swaps the callback so
 * `bun --hot` can update work without creating a new timer (new
 * `setInterval`s often never fire after a soft reload).
 */
export function createPoller(): Poller {
  let intervalMs = 500
  let tick: Tick | undefined
  let stopped = false
  let started = false

  async function spin() {
    while (!stopped) {
      const fn = tick
      if (fn) {
        try {
          await fn()
        } catch {
          // tick logs; keep the loop alive
        }
      }
      await Bun.sleep(intervalMs)
    }
  }

  return {
    kind: "sleep",
    every(ms, next) {
      intervalMs = ms
      tick = next
      if (started || stopped) return
      started = true
      void spin()
    },
    stop() {
      stopped = true
      tick = undefined
    },
  }
}
