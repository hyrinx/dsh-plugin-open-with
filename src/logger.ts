/**
 * Host-side file logger for dsh-plugin-open-with.
 *
 * Log destination is selected by whether the plugin is running in a
 * **local source checkout** (= 本地开发模式, dsh plugin add <本地源码路径>)
 * or a **published npm install** (= 最终用户模式, dsh plugin add <npm包>).
 *
 * Priority (first match wins):
 *   1. Local source checkout  ->  `<PLUGIN_PROJECT_ROOT>/logs/host-YYYY-MM-DD.log`
 *      (project root is detected by walking UP from the compiled host
 *      bundle until we find a directory that simultaneously contains a
 *      `package.json` with `name === "dsh-plugin-open-with"` AND one of
 *      the source folders `src/` / `script/` — both present means this
 *      is a dev checkout, not an extracted npm tarball.)
 *   2. Published npm package    ->  `<dsh-home>/logs/dsh-plugin-open-with/host-YYYY-MM-DD.log`
 *      (one file per day, rolled by date in the filename. The dsh home
 *      precedence is the same as @deepseek-ai/dsh-home-paths: override
 *      -> $DSH_HOME -> ~/.dsh, so daemons/systemd/containers can redirect
 *      via the standard env var.)
 *
 * A single file captures BOTH halves of the plugin: the host writes
 * directly into it, and client-side browser log lines are forwarded via
 * the `/open-with/log` RPC endpoint and appended by the same writer.
 * Everything is also mirrored to stdout/stderr so the dsh boot terminal
 * still shows lines inline during development.
 */
import { mkdirSync, appendFileSync, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const DSH_HOME_ENV = 'DSH_HOME'
const PLUGIN_NAME = 'dsh-plugin-open-with'

/**
 * Starting from the compiled host bundle, walk UP through parent dirs
 * and return the first directory that is clearly a local source
 * checkout: `package.json` must declare `name === "dsh-plugin-open-with"`
 * AND one of the source folders (`src/` or `script/`) must exist beside
 * it (npm tarballs only ship `lib/`, `*.md`, `LICENSE`, `cordis.patch.yml`,
 * `package.json` — never `src/` or `script/`). Returns null when the
 * plugin is installed as a published npm package.
 */
function detectPluginProjectRoot(): string | null {
  // At runtime we are inside lib/index.js (the compiled host bundle).
  // `import.meta.url` → this file → join("..") gives the plugin root when
  // the file is run directly from a checkout; but for safety we walk up.
  let current: string
  try {
    current = dirname(fileURLToPath(import.meta.url as unknown as string))
  } catch {
    // CommonJS fallback (bundlers may emit require-based shims):
    current = typeof __dirname === 'string' ? __dirname : process.cwd()
  }
  // Safety cap: do not walk beyond the drive root / the directory we
  // started from plus 6 levels — enough for "checkout nested inside a
  // monorepo packages/dsh-plugin-open-with/src" pattern.
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
          /* JSON parse error — keep walking */
        }
      }
    } catch {
      /* permission / stat error — keep walking */
    }
    const parent = dirname(current)
    if (parent === current) {
      // Reached a filesystem root (Windows: "C:\\" → dirname returns itself;
      // Unix: "/" → dirname returns "/"). Nothing more to try.
      return null
    }
    current = parent
  }
  return null
}

/** Expand a `~` / `~/` / `~\\` prefix to the OS home (mirrors dsh-home-paths). */
function expandHome(p: string): string {
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~' + sep)) return join(homedir(), p.slice(2))
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

// ── Final log directory selection ──────────────────────────────────────────
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
    // If we cannot create the directory (permissions, etc.), fall back to
    // console-only logging; never throw from a log call.
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
    // ignore — see ensureDir comment
  }
  // Mirror to console for inline boot-terminal visibility. Tag the log
  // source so developers can instantly tell which branch was selected.
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
  /** Client-side forwarded log lines arrive here via the /open-with/log RPC. */
  client: (level: Level, message: string, extra?: unknown) => write(level, 'client', message, extra),
}

/** Absolute path of today's rotated log file. Exposed so host code can tell
 *  users / tests exactly where to look for diagnostics. */
export const LOG_FILE = LOG_PATH
/** Absolute path of the directory that contains today's (and past days')
 *  rotated log files. */
export const LOG_DIRECTORY = LOG_DIR
/** `"local-dev"` -> we detected a local source checkout and are writing to
 *  `<project>/logs`; `"npm-install"` -> we are using the standard dsh home
 *  directory ~/.dsh/logs/dsh-plugin-open-with. Exposed for RPC tests. */
export const LOG_LOCATION = LOG_SOURCE
/** If running as a local source checkout, the absolute project root that
 *  we detected. `null` when running as a published npm install. */
export const PLUGIN_PROJECT_ROOT = DETECTED_PROJECT_ROOT