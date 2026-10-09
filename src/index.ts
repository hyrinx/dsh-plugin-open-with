/**
 * Host half of open-with: four routes on the composition's `webServer`
 * serving the settings document, per-item icons, the launch endpoint the
 * browser split button posts to, and the browser log relay.
 *
 * Security has one home, here. Every route asks the composition's
 * `connection` service for a rejection first: its Host/Origin fence defeats
 * DNS rebinding and cross-site calls, and its browser authentication gates
 * every caller before any setting, icon, or launch is reachable. On top of
 * that fence each route validates its body at the wire (JSON media type, a
 * bounded body, string fields, an item id that exists, an absolute path
 * naming an existing directory).
 *
 * Settings live in the profile the plugin was loaded from
 * (`profile/<mode>/open-with/settings.json`); the log sits beside them.
 * Windows only: every launcher recipe in `./launch.ts` targets win32.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAbsolute } from 'node:path'
import { stat } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-subprocess'
import {
  OPEN_WITH_BUILTIN_MODULES, OPEN_WITH_BUILTINS_PATH, OPEN_WITH_ICON_PREFIX_PATH, OPEN_WITH_LOG_PATH,
  OPEN_WITH_OPEN_PATH, OPEN_WITH_SETTINGS_PATH, defaultSettings,
  type OpenWithBuiltinState, type OpenWithBuiltinsPayload,
  type OpenWithSettings, type OpenWithSettingsPayload,
} from './shared.ts'
import { logFileOf, openWithDirOf, readSettings, settingsFileOf, writeSettings } from './storage.ts'
import { createLogger } from './logger.ts'
import { extractIconPng } from './icons.ts'
import { launchItem, resolveExecutable } from './launch.ts'

/** Cordis function-plugin name. */
export const name = 'open-with'

/** The route carrier, the trust fence guarding every route, and the PATH resolver. */
export const inject = ['subprocess', 'connection', 'webServer']

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface OpenWithConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** Request bodies are tiny JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 64 * 1024

/** JSON response (no-store: settings and launch outcomes are live facts). */
function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** 405 with the route's supported methods. */
function sendMethodNotAllowed(res: ServerResponse, allow: string): void {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/** 404 for an item the icon route cannot serve. */
function sendNoIcon(res: ServerResponse, id: string): void {
  sendJson(res, 404, { code: 'not-found', message: `no icon for item: ${id}` })
}

/** Collect a bounded request body as UTF-8 text; null past the ceiling (stream drained). */
async function readBoundedBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      // Drain the remainder so the refusal is a readable response, not a socket cut.
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

/**
 * Read one request body as JSON, answering the failure itself.
 * @param req - the incoming request.
 * @param res - the response the failure is written to.
 * @returns the parsed value, or undefined when a response has already been sent.
 */
async function readJsonBody(req: IncomingMessage, res: ServerResponse): Promise<unknown | undefined> {
  const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
  if (essence !== 'application/json') {
    sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
    return undefined
  }
  let text: string | null
  try {
    text = await readBoundedBody(req)
  } catch {
    // Swallows a connection error mid-body: nothing is left to answer precisely.
    sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' })
    return undefined
  }
  if (text === null) {
    sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    // Swallows the parse error: a non-JSON body is exactly the invalid case.
    sendJson(res, 400, { code: 'bad-request', message: 'request body must be JSON' })
    return undefined
  }
}

/** Extract a string field from a parsed body, or undefined when absent/mistyped. */
function stringField(body: unknown, key: string): string | undefined {
  if (body === null || typeof body !== 'object') return undefined
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

/** The inventory row members this plugin reads; the boot package owns the full row. */
interface PluginInfoLike {
  readonly entryId: string
  readonly moduleName: string
  readonly enabled: boolean
  readonly readOnlyReason?: string
}

/** The plugin-manager members used to reflect and flip the built-in halves. */
interface PluginManagerLike {
  listPlugins(): Promise<readonly PluginInfoLike[]>
  setPluginEnabled(id: string, enabled: boolean): Promise<unknown>
}

/** Register the settings, icon, open, and log routes behind the connection trust fence. */
export function apply(ctx: Context): void {
  const directory = openWithDirOf(ctx)
  const settingsFile = settingsFileOf(directory)
  const logger = createLogger(ctx, logFileOf(directory))
  logger.info('plugin loaded', { settingsFile })

  /** Answer an untrusted/unauthenticated request; true when it was rejected. */
  const rejected = (req: IncomingMessage, res: ServerResponse): boolean => {
    const connection = ctx.connection as OpenWithConnection | undefined
    const rejection = connection?.requestRejection?.(req)
    if (rejection === undefined) return false
    res.statusCode = rejection
    res.end()
    return true
  }

  /**
   * The stored document, seeding one on the very first read.
   *
   * Presets seed with bare command names; that first read resolves each into an
   * absolute executable path and writes it back once. Every later read returns
   * the saved document as-is, so icon extraction and the launch both read the
   * same saved absolute path, and settings edits never re-resolve.
   */
  const loadSettings = async (): Promise<OpenWithSettings> => {
    const stored = readSettings(settingsFile)
    if (stored !== null) return stored
    const seed = defaultSettings()
    const items = await Promise.all(seed.items.map(async (item) => ({
      ...item,
      path: await resolveExecutable(ctx, item.path),
    })))
    const seeded: OpenWithSettings = { ...seed, items }
    try {
      writeSettings(settingsFile, seeded)
    } catch (err) {
      // Swallows the write failure: the document is still served, and the
      // next read seeds again.
      logger.warn('could not persist the seeded settings', err)
    }
    return seeded
  }

  /** Per-executable icon cache (null = resolved as unavailable). */
  const icons = new Map<string, Promise<Buffer | null>>()
  const iconOf = (executable: string): Promise<Buffer | null> => {
    let cached = icons.get(executable)
    if (cached === undefined) {
      cached = extractIconPng(ctx, executable, logger)
      icons.set(executable, cached)
    }
    return cached
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OPEN_WITH_SETTINGS_PATH,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (rejected(req, res)) return
      if (req.method === 'GET') {
        const payload: OpenWithSettingsPayload = { settings: await loadSettings() }
        sendJson(res, 200, payload)
        return
      }
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'GET, POST')
        return
      }
      const body = await readJsonBody(req, res)
      if (body === undefined) return
      if (body === null || typeof body !== 'object' || !('settings' in body)) {
        sendJson(res, 400, { code: 'bad-request', message: 'request body must be JSON with a "settings" field' })
        return
      }
      try {
        const saved = writeSettings(settingsFile, (body as { settings: unknown }).settings)
        logger.info('settings saved', { file: settingsFile })
        sendJson(res, 200, { settings: saved })
      } catch (err) {
        logger.error('settings write failed', err)
        sendJson(res, 500, { code: 'write-failed', message: 'could not write the settings file' })
      }
    },
  }), `open-with: ${OPEN_WITH_SETTINGS_PATH}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: OPEN_WITH_ICON_PREFIX_PATH,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      // Node always sets url on server requests; String keeps that fact local.
      const pathname = new URL(String(req.url), 'http://localhost').pathname
      const id = decodeURIComponent(pathname.slice(OPEN_WITH_ICON_PREFIX_PATH.length).replace(/^\//, ''))
      const item = (await loadSettings()).items.find(entry => entry.id === id)
      if (item === undefined || id.length === 0 || item.path.length === 0) {
        sendNoIcon(res, id)
        return
      }
      // loadSettings keeps item.path as an absolute executable path, so the
      // icon is extracted from exactly the file a launch would start.
      const bytes = await iconOf(item.path)
      if (bytes === null || bytes.length === 0) {
        sendNoIcon(res, id)
        return
      }
      res.statusCode = 200
      res.setHeader('content-type', 'image/png')
      // no-store: a custom item keeps its id across path edits, so a cached
      // icon would survive the change it invalidated.
      res.setHeader('cache-control', 'no-store')
      res.end(bytes)
    },
  }), `open-with: ${OPEN_WITH_ICON_PREFIX_PATH}/<id>`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OPEN_WITH_OPEN_PATH,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'POST')
        return
      }
      const body = await readJsonBody(req, res)
      if (body === undefined) return
      const target = stringField(body, 'target')
      const workspace = stringField(body, 'path')
      if (target === undefined || target.length === 0 || workspace === undefined || workspace.length === 0) {
        sendJson(res, 400, { code: 'bad-request', message: 'request body must be JSON with string "target" and "path"' })
        return
      }
      const item = (await loadSettings()).items.find(entry => entry.id === target)
      if (item === undefined) {
        sendJson(res, 400, { code: 'bad-request', message: `unknown item: ${target}` })
        return
      }
      if (!isAbsolute(workspace)) {
        sendJson(res, 400, { code: 'bad-request', message: 'path must be an absolute directory path' })
        return
      }
      let isDirectory: boolean
      try {
        isDirectory = (await stat(workspace)).isDirectory()
      } catch {
        // Swallows ENOENT/EACCES: both mean there is no directory to open.
        isDirectory = false
      }
      if (!isDirectory) {
        sendJson(res, 404, { code: 'not-found', message: `directory does not exist: ${workspace}` })
        return
      }
      try {
        launchItem(ctx, item.id, item.path, workspace, item.passCwd !== false, logger)
        sendJson(res, 200, { ok: true })
      } catch (err) {
        logger.error('launch failed', { target, err })
        sendJson(res, 502, { code: 'launch-failed', message: `failed to launch ${target}` })
      }
    },
  }), `open-with: ${OPEN_WITH_OPEN_PATH}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OPEN_WITH_LOG_PATH,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'POST')
        return
      }
      const body = await readJsonBody(req, res)
      if (body === undefined) return
      const level = stringField(body, 'level')
      const message = stringField(body, 'message')
      const extra = body !== null && typeof body === 'object'
        ? (body as { extra?: unknown }).extra
        : undefined
      const normalized = level === 'warn' || level === 'error' ? level : 'info'
      logger.client(normalized, message ?? '', extra)
      sendJson(res, 200, { ok: true })
    },
  }), `open-with: ${OPEN_WITH_LOG_PATH}`)

  /** The profile's plugin manager, or undefined when this profile exposes none. */
  const pluginManager = (): PluginManagerLike | undefined => {
    const service = ctx.get('pluginManager') as PluginManagerLike | undefined
    return typeof service?.listPlugins === 'function' ? service : undefined
  }

  /** Observe the built-in pair in the live plugin inventory, as one unit. */
  const readBuiltins = async (manager: PluginManagerLike): Promise<OpenWithBuiltinState> => {
    const rows = await manager.listPlugins()
    const halves = OPEN_WITH_BUILTIN_MODULES.map(moduleName =>
      rows.find(entry => entry.moduleName === moduleName))
    const reason = halves.map(row => row?.readOnlyReason).find(value => value !== undefined)
    return {
      present: halves.every(row => row !== undefined),
      enabled: halves.every(row => row?.enabled === true),
      readOnly: reason !== undefined,
      ...(reason === 'management-required' || reason === 'unaddressable' ? { readOnlyReason: reason } : {}),
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OPEN_WITH_BUILTINS_PATH,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (rejected(req, res)) return
      const manager = pluginManager()
      if (req.method === 'GET') {
        if (manager === undefined) {
          const payload: OpenWithBuiltinsPayload = {
            available: false, present: false, enabled: false, readOnly: false,
          }
          sendJson(res, 200, payload)
          return
        }
        try {
          const state = await readBuiltins(manager)
          logger.info('built-in plugin state read', {
            present: state.present,
            enabled: state.enabled,
            readOnly: state.readOnlyReason ?? false,
          })
          const payload: OpenWithBuiltinsPayload = { available: true, ...state }
          sendJson(res, 200, payload)
        } catch (err) {
          logger.error('plugin inventory read failed', err)
          sendJson(res, 502, { code: 'inventory-failed', message: 'could not read the plugin inventory' })
        }
        return
      }
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'GET, POST')
        return
      }
      if (manager === undefined) {
        sendJson(res, 409, { code: 'unavailable', message: 'this profile exposes no plugin manager' })
        return
      }
      const body = await readJsonBody(req, res)
      if (body === undefined) return
      const enabled = body !== null && typeof body === 'object'
        ? (body as { enabled?: unknown }).enabled
        : undefined
      if (typeof enabled !== 'boolean') {
        sendJson(res, 400, {
          code: 'bad-request',
          message: 'request body must be JSON with a boolean "enabled"',
        })
        return
      }
      try {
        // Resolve and vet every half first: a refusal must leave both untouched,
        // so a toggle that cannot address one half never half-applies.
        const rows = await manager.listPlugins()
        const halves: PluginInfoLike[] = []
        for (const moduleName of OPEN_WITH_BUILTIN_MODULES) {
          const row = rows.find(entry => entry.moduleName === moduleName)
          if (row === undefined) {
            sendJson(res, 404, { code: 'not-found', message: `not loaded in this profile: ${moduleName}` })
            return
          }
          if (row.readOnlyReason !== undefined) {
            sendJson(res, 409, { code: row.readOnlyReason, message: `this entry is ${row.readOnlyReason}` })
            return
          }
          halves.push(row)
        }
        for (const row of halves) await manager.setPluginEnabled(row.entryId, enabled)
        logger.info('built-in plugins toggled', { modules: OPEN_WITH_BUILTIN_MODULES, enabled })
        const payload: OpenWithBuiltinsPayload = { available: true, ...await readBuiltins(manager) }
        sendJson(res, 200, payload)
      } catch (err) {
        logger.error('built-in plugin toggle failed', { modules: OPEN_WITH_BUILTIN_MODULES, err })
        sendJson(res, 502, { code: 'toggle-failed', message: 'could not change the built-in open-in-app plugins' })
      }
    },
  }), `open-with: ${OPEN_WITH_BUILTINS_PATH}`)

  // 首次加载时自动关闭内置 open-in-app 插件，避免与本插件同时出现两个打开按钮
  ctx.effect(() => {
    const manager = pluginManager()
    if (manager === undefined) return
    manager.listPlugins().then((rows) => {
      const halves = OPEN_WITH_BUILTIN_MODULES
        .map(moduleName => rows.find(entry => entry.moduleName === moduleName))
        .filter((row): row is PluginInfoLike => row !== undefined)
      if (halves.length === 0) return
      const hasReadOnly = halves.some(row => row.readOnlyReason !== undefined)
      if (hasReadOnly) {
        logger.info('built-in plugins are read-only, skipping auto-disable')
        return
      }
      const allDisabled = halves.every(row => !row.enabled)
      if (allDisabled) return
      return Promise.all(halves.map(row => manager.setPluginEnabled(row.entryId, false)))
        .then(() => { logger.info('auto-disabled built-in plugins', { modules: OPEN_WITH_BUILTIN_MODULES }) })
    }).catch((err: unknown) => {
      logger.error('auto-disable built-in plugins failed', err)
    })
  })
}