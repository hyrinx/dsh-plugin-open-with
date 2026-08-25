/**
 * Host-side plugin: registers `/open-with` RPC (launch / log / extractIcon /
 * readSettings / writeSettings / resolvePresetPath).
 * 当前仅支持 Windows 平台。
 * `launch` spawns 预设或自定义启动器到工作区目录。
 * `extractIcon` 通过 PowerShell 从 .exe 提取 base64 PNG 图标。
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-client-connection'
import { logger } from './logger.js'
import { resolveDshHome, dshHomePath } from './dsh-home.js'
import * as path from 'node:path'
import * as fs from 'node:fs'

/** 设置文件存储路径：遵循 DSH 规范，$DSH_HOME/storages/dsh-open-with/settings.json */
const SETTINGS_DIR = dshHomePath('storages', 'dsh-open-with')
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json')

export type LaunchTarget = 'code' | 'cmd' | 'explorer' | 'powershell'

/** 设置项结构（与 client 端 OpenWithItem 保持一致）。 */
interface SettingsItem {
  id: string
  name: string
  path: string
  icon: string
  preset: boolean
  target?: string
}

interface AppSettings {
  currentId: string
  items: SettingsItem[]
  hiddenIds: string[]
}

/** 读取设置文件，失败时返回 null。 */
function readSettingsSync(): AppSettings | null {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return null
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw) as AppSettings
  } catch {
    return null
  }
}

export const inject = ['subprocess', 'connection']

async function buildSpawnSpec(
  ctx: Context,
  target: LaunchTarget,
  cwd: string,
): Promise<{ argv: readonly string[]; useSpawnCwd: boolean }> {
  switch (target) {
    case 'code': {
      const exe = await ctx.subprocess.resolveExecutable('code')
      return {
        argv: ['cmd', '/c', exe, cwd],
        useSpawnCwd: false,
      }
    }
    case 'cmd': {
      const windir = process.env.windir ?? 'C:\\Windows'
      const cmdPath = `${windir}\\System32\\cmd.exe`
      const escapedCwd = cwd.includes(' ') ? `"${cwd}"` : cwd
      const innerCommands = `title ${cmdPath} && cd /d ${escapedCwd}`
      return {
        argv: ['cmd', '/c', 'start', `"${cmdPath}"`, 'cmd', '/K', innerCommands],
        useSpawnCwd: false,
      }
    }
    case 'powershell': {
      const windir = process.env.windir ?? 'C:\\Windows'
      const psPath = `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
      const escapedCwd = cwd.replace(/'/g, "''")
      return {
        argv: [
          'cmd', '/c', 'start', `"${psPath}"`, 'powershell', '-NoExit',
          '-Command',
          `[Console]::Title = '${psPath.replace(/'/g, "''")}'; Set-Location -LiteralPath '${escapedCwd}'`,
        ],
        useSpawnCwd: false,
      }
    }
    case 'explorer': {
      return {
        argv: ['explorer.exe', cwd],
        useSpawnCwd: false,
      }
    }
    default: {
      const _exhaustive: never = target
      throw new Error(`unknown launch target: ${String(_exhaustive)}`)
    }
  }
}

/** 通过 PowerShell 从 exe 文件中提取图标，返回 base64 PNG data URL。 */
async function extractFileIcon(ctx: Context, exePath: string): Promise<string> {
  logger.info('extractIcon start', { exePath })
  const escapedPath = exePath.replace(/'/g, "''")
  const psScript = [
    `$ErrorActionPreference = 'Stop'`,
    `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`,
    `Add-Type -AssemblyName System.Drawing -ErrorAction Stop`,
    `$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${escapedPath}')`,
    `if (!$icon) { exit 0 }`,
    `$bitmap = $icon.ToBitmap()`,
    `$ms = New-Object System.IO.MemoryStream`,
    `$bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)`,
    `$bytes = $ms.ToArray()`,
    `$base64 = [Convert]::ToBase64String($bytes)`,
    `Write-Output "data:image/png;base64,$base64"`,
    `$ms.Close(); $bitmap.Dispose(); $icon.Dispose()`,
  ].join('; ')
  // DSH subprocess 必须用 SubprocessCollect 模式（{ maxBytes }），
  // 不能用 'pipe' 字符串，否则 handle.collected 为 undefined
  const maxBytes = 2 * 1024 * 1024
  const handle = ctx.subprocess.spawn({
    argv: ['powershell', '-NoProfile', '-NonInteractive', '-Command', psScript],
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes },
      stderr: { maxBytes },
    },
    graceMs: 15000,
  })
  const outcome = await handle.done
  const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
  if (outcome.exitCode !== 0) {
    logger.error('extractIcon PowerShell failed', { exePath, exitCode: outcome.exitCode, stderr })
    return ''
  }
  if (stderr) {
    logger.warn('extractIcon PowerShell stderr', { exePath, stderr })
  }
  const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
  const icon = stdout.trim()
  if (!icon) {
    logger.warn('extractIcon returned empty', { exePath, stdoutLen: stdout.length, stderr })
  } else {
    logger.info('extractIcon done', { exePath, dataLen: icon.length })
  }
  return icon
}

/** 获取预设启动器的实际可执行文件路径。 */
function resolvePresetPath(ctx: Context, target: LaunchTarget): string {
  const windir = process.env.windir ?? 'C:\\Windows'
  switch (target) {
    case 'cmd':
      return `${windir}\\System32\\cmd.exe`
    case 'powershell':
      return `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    case 'explorer':
      return `${windir}\\explorer.exe`
    case 'code':
      // 异步解析在 RPC handler 中处理
      return 'code'
    default:
      return ''
  }
}

export function apply(ctx: Context): void {
  logger.info('plugin loaded')
  ctx.effect(() => {
    return ctx.connection.rpc.handle(
      '/open-with',
      async (endpoint: string, payload: unknown) => {
        logger.info('RPC /open-with', { endpoint, payload })
        if (endpoint === 'log') {
          const { level = 'info', message = '', extra } = (payload ?? {}) as {
            level?: 'info' | 'warn' | 'error'
            message?: string
            extra?: unknown
          }
          logger.client(level, String(message), extra)
          return { ok: true, value: null }
        }
        if (endpoint === 'extractIcon') {
          const { exePath } = (payload ?? {}) as { exePath?: string }
          if (typeof exePath !== 'string' || exePath.length === 0) {
            return { ok: false, error: { code: 'invalid-path', message: 'exePath is required' } }
          }
          try {
            const icon = await extractFileIcon(ctx, exePath)
            return { ok: true, value: { icon } }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            logger.error('extractIcon failed', err)
            return { ok: false, error: { code: 'extract-failed', message } }
          }
        }
        if (endpoint === 'resolvePresetPath') {
          const { target } = (payload ?? {}) as { target?: LaunchTarget }
          if (!target || !['code', 'cmd', 'powershell', 'explorer'].includes(target)) {
            return { ok: false, error: { code: 'invalid-target', message: 'target is required' } }
          }
          try {
            let resolvedPath: string
            if (target === 'code') {
              resolvedPath = await ctx.subprocess.resolveExecutable('code')
              // resolveExecutable 返回的是 PATH 中的 code.cmd（CLI 包装器），
              // 尝试反查真实的 Code.exe（位于 bin/ 的上级目录）
              const ext = path.extname(resolvedPath).toLowerCase()
              if (ext === '.cmd' || ext === '.bat') {
                const binDir = path.dirname(resolvedPath)
                const vsCodeDir = path.dirname(binDir)
                const exePath = path.join(vsCodeDir, 'Code.exe')
                if (fs.existsSync(exePath)) {
                  resolvedPath = exePath
                }
              }
            } else {
              resolvedPath = resolvePresetPath(ctx, target)
            }
            return { ok: true, value: { path: resolvedPath } }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            logger.error('resolvePresetPath failed', err)
            return { ok: false, error: { code: 'resolve-failed', message } }
          }
        }
        if (endpoint === 'readSettings') {
          try {
            if (!fs.existsSync(SETTINGS_FILE)) {
              return { ok: true, value: { settings: null } }
            }
            const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8')
            return { ok: true, value: { settings: JSON.parse(raw) } }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            logger.error('readSettings failed', err)
            return { ok: false, error: { code: 'read-failed', message } }
          }
        }
        if (endpoint === 'writeSettings') {
          const { settings } = (payload ?? {}) as { settings?: unknown }
          if (settings === undefined) {
            return { ok: false, error: { code: 'invalid-settings', message: 'settings is required' } }
          }
          try {
            await fs.promises.mkdir(SETTINGS_DIR, { recursive: true })
            const tmp = SETTINGS_FILE + '.tmp'
            await fs.promises.writeFile(tmp, JSON.stringify(settings, null, 2), 'utf-8')
            await fs.promises.rename(tmp, SETTINGS_FILE)
            logger.info('settings saved', { file: SETTINGS_FILE })
            return { ok: true, value: {} }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            logger.error('writeSettings failed', err)
            return { ok: false, error: { code: 'write-failed', message } }
          }
        }
        if (endpoint !== 'launch') {
          logger.warn('unknown endpoint', endpoint)
          return { ok: false, error: { code: 'unknown-endpoint', message: `unknown endpoint: ${endpoint}` } }
        }
        const { cwd, target } = (payload ?? {}) as { cwd?: string; target?: string }
        if (typeof cwd !== 'string' || cwd.length === 0) {
          logger.warn('cwd missing or invalid', { cwd })
          return { ok: false, error: { code: 'invalid-cwd', message: 'cwd is required' } }
        }
        const targetStr: string = target ?? 'code'
        const isPreset = ['code', 'cmd', 'powershell', 'explorer'].includes(targetStr)
        const resolvedTarget: LaunchTarget = isPreset ? targetStr as LaunchTarget : 'code'
        try {
          if (!isPreset) {
            // 自定义项：从设置中查找路径，用 cmd /c start 启动
            const settings = readSettingsSync()
            const item = settings?.items.find((it) => it.id === targetStr)
            if (!item || item.preset || !item.path) {
              return { ok: false, error: { code: 'invalid-target', message: `custom item not found: ${targetStr}` } }
            }
            const escapedCwd = cwd.includes(' ') ? `"${cwd}"` : cwd
            const handle = ctx.subprocess.spawn({
              argv: ['cmd', '/c', 'start', '', item.path],
              cwd: cwd,
              stdio: { stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' },
              graceMs: 5000,
            })
            logger.info('spawned custom item', { target: targetStr, path: item.path, pid: handle.pid })
            handle.done.catch((err: unknown) => {
              logger.error('process exited with error', err)
            })
            return { ok: true, value: { launched: true, target: targetStr, pid: handle.pid } }
          }
          if (resolvedTarget === 'code') {
            const exe = await ctx.subprocess.resolveExecutable('code')
            logger.info('resolved code ->', exe)
          }
          const { argv, useSpawnCwd } = await buildSpawnSpec(ctx, resolvedTarget, cwd)
          const handle = ctx.subprocess.spawn({
            argv: [...argv],
            cwd: useSpawnCwd ? cwd : process.cwd(),
            stdio: { stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' },
            graceMs: 5000,
          })
          logger.info('spawned', { target: resolvedTarget, argv, pid: handle.pid })
          handle.done.catch((err: unknown) => {
            logger.error('process exited with error', err)
          })
          return { ok: true, value: { launched: true, target: resolvedTarget, pid: handle.pid } }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          logger.error('launch failed', err)
          if (resolvedTarget === 'code') {
            logger.error('install "code" CLI via VS Code Command Palette: "Shell Command: Install \'code\' command in PATH"')
          }
          return { ok: false, error: { code: 'launch-failed', message: `failed to launch ${targetStr}: ${message}` } }
        }
      },
      { authority: 'loopback' },
    )
  }, 'open-with: RPC handler')
}