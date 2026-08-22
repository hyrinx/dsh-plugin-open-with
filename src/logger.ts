/**
 * Host-side file logger for dsh-plugin-open-with.
 *
 * Writes to <dsh-home>/logs/dsh-plugin-open-with/host-YYYY-MM-DD.log
 * (one file per day, rolled by date in the filename). Also mirrors to
 * stdout/stderr so the dsh boot terminal still shows the same lines
 * inline. Client-side log lines are forwarded via the `/open-with/log`
 * RPC endpoint and routed here, so a single file captures both halves of
 * the plugin.
 *
 * The dsh home directory resolution mirrors @deepseek-ai/dsh-home-paths:
 * highest precedence first — an explicit override, `$DSH_HOME`, then
 * `~/.dsh` (= `os.homedir()/.dsh`). This keeps the plugin aligned with
 * where dsh itself writes profile data, so the same path works for:
 *   - Windows interactive users  → C:\Users\<user>\.dsh\logs\...
 *   - Windows SYSTEM service       → $DSH_HOME\logs\... (set by the service)
 *   - macOS/Linux interactive      → /Users|home/<user>/.dsh/logs/...
 *   - systemd/daemon               → $DSH_HOME/logs/... (set by the unit)
 *   - containers                   → $DSH_HOME/logs/... (set in the image)
 */
import { mkdirSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const DSH_HOME_ENV = 'DSH_HOME'
const PLUGIN_NAME = 'dsh-plugin-open-with'

/** Expand a `~` / `~/` / `~\` prefix to the OS home (mirrors dsh-home-paths). */
function expandHome(p: string): string {
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
  return p
}

/**
 * Resolve the dsh home directory using dsh's own precedence:
 *   1. explicit override (caller-supplied)
 *   2. $DSH_HOME (env var; blank/whitespace-only treated as unset)
 *   3. ~/.dsh (default)
 */
function resolveDshHome(configured?: string): string {
  const fromEnv = process.env[DSH_HOME_ENV]
  const raw = configured ?? (fromEnv != null && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), '.dsh'))
  return resolve(expandHome(raw))
}

const LOG_DIR = join(resolveDshHome(), 'logs', PLUGIN_NAME)
const LOG_PATH = join(LOG_DIR, `host-${new Date().toISOString().slice(0, 10)}.log`)

let initialized = false
function ensureDir(): void {
  if (initialized) return
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    initialized = true
  } catch {
    // If we cannot create the directory (permissions, etc.), fall back to
    // console-only logging; never throw from a log call.
  }
}

type Level = 'info' | 'warn' | 'error'

function write(level: Level, scope: 'host' | 'client', message: string, extra?: unknown): void {
  ensureDir()
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level}] [${scope}] ${message}${extra != null ? ' ' + safeStringify(extra) : ''}\n`
  try {
    appendFileSync(LOG_PATH, line, 'utf8')
  } catch {
    // ignore — see ensureDir comment
  }
  // Mirror to console for inline boot-terminal visibility.
  const consoleLine = `[open-with] [${scope}] ${message}${extra != null ? ' ' + safeStringify(extra) : ''}`
  if (level === 'error') console.error(consoleLine)
  else if (level === 'warn') console.warn(consoleLine)
  else console.log(consoleLine)
}

function safeStringify(v: unknown): string {
  if (v instanceof Error) return v.stack ?? `${v.name}: ${v.message}`
  try {
    return typeof v === 'string' ? v : JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export const logger = {
  info: (message: string, extra?: unknown) => write('info', 'host', message, extra),
  warn: (message: string, extra?: unknown) => write('warn', 'host', message, extra),
  error: (message: string, extra?: unknown) => write('error', 'host', message, extra),
  /** Client-side forwarded log lines arrive here via the /open-with/log RPC. */
  client: (level: Level, message: string, extra?: unknown) => write(level, 'client', message, extra),
}

export const LOG_FILE = LOG_PATH
