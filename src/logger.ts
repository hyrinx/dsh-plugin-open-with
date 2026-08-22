/**
 * Host-side file logger for dsh-plugin-open-with.
 *
 * Log directory selection:
 *   - local source checkout (detected by walking UP from ./lib/ to a dir
 *     that contains package.json with name "dsh-plugin-open-with" plus
 *     src/ or script/) -> `<project>/logs/host-YYYY-MM-DD.log`
 *   - published npm install -> `$DSH_HOME/logs/dsh-plugin-open-with/host-YYYY-MM-DD.log`
 *     ($DSH_HOME precedence: explicit override -> $DSH_HOME env -> ~/.dsh)
 *
 * Host calls are written directly; browser-side log lines are forwarded
 * via the `/open-with/log` RPC endpoint. Everything is also mirrored to
 * stdout / stderr.
 */
import { mkdirSync, appendFileSync, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const DSH_HOME_ENV = 'DSH_HOME'
const PLUGIN_NAME = 'dsh-plugin-open-with'

function detectPluginProjectRoot(): string | null {
  // Walk up from the compiled host bundle location.
  let current: string
  try {
    current = dirname(fileURLToPath(import.meta.url as unknown as string))
  } catch {
    current = typeof __dirname === 'string' ? __dirname : process.cwd()
  }
  const rootsSeen = new Set<string>()
  for (let depth = 0; depth < 8; depth++) {
    if (rootsSeen.has(current)) return null
    rootsSeen.add(current)
    try {
      const pkgPath = join(current, 'package.json')
      if (existsSync(pkgPath) && statSync(pkgPath).isFile()) {
        try {
          const raw = readFileSync(pkgPath, 'utf8')
          const pkg = JSON.parse(raw) as { name?: unknown }
          if (pkg.name === PLUGIN_NAME) {
            const hasSrc = existsSync(join(current, 'src')) && statSync(join(current, 'src')).isDirectory()
            const hasScript = existsSync(join(current, 'script')) && statSync(join(current, 'script')).isDirectory()
            if (hasSrc || hasScript) return resolve(current)
          }
        } catch {
          /* keep walking */
        }
      }
    } catch {
      /* keep walking */
    }
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
  return null
}

function expandHome(p: string): string {
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~' + sep)) return join(homedir(), p.slice(2))
  return p
}

function resolveDshHome(configured?: string): string {
  const fromEnv = process.env[DSH_HOME_ENV]
  const raw = configured ?? (fromEnv != null && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), '.dsh'))
  return resolve(expandHome(raw))
}

const DETECTED_PROJECT_ROOT = detectPluginProjectRoot()
const LOG_SOURCE: 'local-dev' | 'npm-install' = DETECTED_PROJECT_ROOT != null ? 'local-dev' : 'npm-install'
const LOG_DIR =
  LOG_SOURCE === 'local-dev'
    ? join(DETECTED_PROJECT_ROOT as string, 'logs')
    : join(resolveDshHome(), 'logs', PLUGIN_NAME)
const LOG_PATH = join(LOG_DIR, `host-${new Date().toISOString().slice(0, 10)}.log`)

let initialized = false
function ensureDir(): void {
  if (initialized) return
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    initialized = true
  } catch {
    /* log-write failures swallow; console mirror still runs */
  }
}

type Level = 'info' | 'warn' | 'error'

function write(level: Level, scope: 'host' | 'client', message: string, extra?: unknown): void {
  ensureDir()
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level}] [${scope}] [${LOG_SOURCE}] ${message}${extra != null ? ' ' + safeStringify(extra) : ''}\n`
  try {
    appendFileSync(LOG_PATH, line, 'utf8')
  } catch {
    /* ignore */
  }
  const tag = LOG_SOURCE === 'local-dev' ? `open-with+logs` : `open-with`
  const consoleLine = `[${tag}] [${scope}] ${message}${extra != null ? ' ' + safeStringify(extra) : ''}`
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
  client: (level: Level, message: string, extra?: unknown) => write(level, 'client', message, extra),
}

/** Absolute path of today's rotated log file. */
export const LOG_FILE = LOG_PATH
/** Directory containing rotated log files. */
export const LOG_DIRECTORY = LOG_DIR
/** `"local-dev"` or `"npm-install"` based on how the plugin was installed. */
export const LOG_LOCATION = LOG_SOURCE
/** Project root detected when running as local source checkout; `null` for npm installs. */
export const PLUGIN_PROJECT_ROOT = DETECTED_PROJECT_ROOT
