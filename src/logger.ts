/**
 * Host logging for this plugin.
 *
 * One file, `profile/<mode>/open-with/host.log`, truncated on every plugin
 * load so it always describes the current session. Lines are mirrored to the
 * composition logger (`ctx.logger('open-with')`), which is where DSH's own
 * console exporter picks them up; the file exists because the console is not
 * readable after the fact.
 *
 * Writes never throw: a failing log must not take the plugin down.
 */

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'

/** Log levels accepted on the wire and in the file. */
export type LogLevel = 'info' | 'warn' | 'error'

/** The plugin's logger surface. */
export interface OpenWithLogger {
  info(message: string, extra?: unknown): void
  warn(message: string, extra?: unknown): void
  error(message: string, extra?: unknown): void
  /** Write one line forwarded from the browser half. */
  client(level: LogLevel, message: string, extra?: unknown): void
}

/** Render one value for a log line; errors keep their stack. */
function stringify(value: unknown): string {
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Create the logger bound to one log file.
 * @param ctx - host plugin context (its composition logger is the console mirror).
 * @param logFile - absolute log path; its directory is created and the file truncated.
 * @returns the logger surface used by the rest of the host half.
 */
export function createLogger(ctx: Context, logFile: string): OpenWithLogger {
  const scoped: Record<LogLevel, (message: string) => void> | undefined =
    typeof ctx.logger === 'function' ? ctx.logger('open-with') : undefined
  try {
    mkdirSync(dirname(logFile), { recursive: true })
    writeFileSync(logFile, '', 'utf8')
  } catch {
    // Swallows an unwritable profile directory: the console mirror still runs.
  }

  const write = (
    level: LogLevel,
    scope: 'host' | 'client',
    message: string,
    extra?: unknown,
  ): void => {
    const rendered = extra === undefined ? '' : ` ${stringify(extra)}`
    const line = `[${level}] [${scope}] ${message}${rendered}\n`
    try {
      appendFileSync(logFile, line, 'utf8')
    } catch {
      // Swallows a mid-run write failure; see the module docblock.
    }
    scoped?.[level](`[${scope}] ${message}${rendered}`)
  }

  return {
    info: (message, extra) => { write('info', 'host', message, extra) },
    warn: (message, extra) => { write('warn', 'host', message, extra) },
    error: (message, extra) => { write('error', 'host', message, extra) },
    client: (level, message, extra) => { write(level, 'client', message, extra) },
  }
}
