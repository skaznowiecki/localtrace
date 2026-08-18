const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
} as const

export type LogLevel = keyof typeof LEVELS

const OUT = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
} as const

let min: (typeof LEVELS)[LogLevel] = LEVELS.info

export function parseLevel(
  raw: string | undefined,
  fallback: LogLevel = "info",
): LogLevel {
  const key = raw?.trim().toLowerCase()
  return key && key in LEVELS ? (key as LogLevel) : fallback
}

export function setLevel(level: string): void {
  min = LEVELS[parseLevel(level)]
}

function emit(level: Exclude<LogLevel, "silent">, ...args: unknown[]): void {
  if (LEVELS[level] < min) return
  OUT[level](...args)
}

function info(message: string, ...rest: unknown[]): void {
  emit("info", message, ...rest)
}

export const log = Object.assign(info, {
  debug: (message: string, ...rest: unknown[]) => emit("debug", message, ...rest),
  info,
  warn: (message: string, ...rest: unknown[]) => emit("warn", message, ...rest),
  error: (...args: unknown[]) => emit("error", ...args),
})
