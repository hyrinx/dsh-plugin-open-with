/**
 * Host-side file logger for dsh-plugin-open-with.
 *
 * 只保留一个日志文件 host.log，每次启动时清空旧内容。
 * 日志行不包含时间戳，保持简洁。
 *
 * 路径选择：
 *   - 本地源码开发 -> `<项目根目录>/host.log`
 *   - npm 安装 -> `$DSH_HOME/logs/dsh-plugin-open-with/host.log`
 *
 * Host 端直接写入；浏览器端通过 /open-with/log RPC 转发。
 * 所有内容同时镜像到 stdout / stderr。
 */
import { mkdirSync, appendFileSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from './dsh-home.js'

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
            if (hasSrc) return resolve(current)
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

const DETECTED_PROJECT_ROOT = detectPluginProjectRoot()
const LOG_SOURCE: 'local-dev' | 'npm-install' = DETECTED_PROJECT_ROOT != null ? 'local-dev' : 'npm-install'
const LOG_DIR =
  LOG_SOURCE === 'local-dev'
    ? (DETECTED_PROJECT_ROOT as string)
    : join(resolveDshHome(), 'logs', PLUGIN_NAME)
const LOG_PATH = join(LOG_DIR, 'host.log')

let initialized = false
function ensureDir(): void {
  if (initialized) return
  try {
    // 开发模式下项目根目录已存在，无需 mkdir
    if (LOG_SOURCE !== 'local-dev') {
      mkdirSync(LOG_DIR, { recursive: true })
    }
    writeFileSync(LOG_PATH, '', 'utf8')
    initialized = true
  } catch {
    /* log-write failures swallow; console mirror still runs */
  }
}

type Level = 'info' | 'warn' | 'error'

function write(level: Level, scope: 'host' | 'client', message: string, extra?: unknown): void {
  ensureDir()
  const line = `[${level}] [${scope}] ${message}${extra != null ? ' ' + safeStringify(extra) : ''}\n`
  try {
    appendFileSync(LOG_PATH, line, 'utf8')
  } catch {
    /* ignore */
  }
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
  client: (level: Level, message: string, extra?: unknown) => write(level, 'client', message, extra),
}

/** 日志文件的绝对路径。每次启动时清空，只保留当次会话的内容。 */
export const LOG_FILE = LOG_PATH
/** 日志文件所在目录。 */
export const LOG_DIRECTORY = LOG_DIR
/** `"local-dev"` or `"npm-install"` based on how the plugin was installed. */
export const LOG_LOCATION = LOG_SOURCE
/** Project root detected when running as local source checkout; `null` for npm installs. */
export const PLUGIN_PROJECT_ROOT = DETECTED_PROJECT_ROOT