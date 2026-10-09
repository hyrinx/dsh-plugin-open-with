/**
 * Browser-side HTTP carrier for the capsule button and the settings page.
 *
 * Every read, write, and launch is one request against the host routes; there
 * is no client-side cache, so the menu and the settings page always show the
 * document the host actually holds.
 */

import {
  OPEN_WITH_LOG_ROUTE, OPEN_WITH_OPEN_ROUTE, OPEN_WITH_SETTINGS_ROUTE,
  normalizeSettings,
  type OpenWithLogPayload, type OpenWithOpenPayload,
  type OpenWithSettings, type OpenWithSettingsPayload,
} from '../shared.ts'

type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>

/** Log levels the log route accepts. */
export type OpenWithLogLevel = 'info' | 'warn' | 'error'

export class OpenWithController {
  /**
   * @param fetcher - HTTP carrier; injectable so tests can drive it directly.
   */
  constructor(private readonly fetcher: Fetch = (input, init) => fetch(input, init)) {}

  /**
   * Read the settings document.
   * @returns the host's normalized document.
   */
  async load(): Promise<OpenWithSettingsPayload> {
    const response = await this.fetcher(OPEN_WITH_SETTINGS_ROUTE, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`settings read failed: HTTP ${String(response.status)}`)
    const payload = await response.json() as { settings?: unknown }
    return { settings: normalizeSettings(payload.settings) }
  }

  /**
   * Replace the settings document.
   * @param settings - the document to persist.
   * @returns the host's normalized document.
   */
  async save(settings: OpenWithSettings): Promise<OpenWithSettings> {
    const response = await this.fetcher(OPEN_WITH_SETTINGS_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    if (!response.ok) throw new Error(`settings write failed: HTTP ${String(response.status)}`)
    const payload = await response.json() as { settings?: unknown }
    return normalizeSettings(payload.settings)
  }

  /**
   * Launch one item on one workspace directory.
   * @param target - item id from the settings document.
   * @param path - the session's absolute workspace directory.
   * @returns after the host accepted the launch; rejects on any failure.
   */
  async launch(target: string, path: string): Promise<void> {
    const body: OpenWithOpenPayload = { target, path }
    const response = await this.fetcher(OPEN_WITH_OPEN_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (response.ok) return
    let detail = ''
    try {
      detail = ` ${JSON.stringify(await response.json())}`
    } catch {
      // Swallows a non-JSON error body: the status alone still identifies the failure.
    }
    throw new Error(`launch failed: HTTP ${String(response.status)}${detail}`)
  }

  /**
   * Mirror one line into the browser console and the host log file.
   * @param level - log level.
   * @param message - the line.
   * @param extra - optional structured detail.
   */
  log(level: OpenWithLogLevel, message: string, extra?: unknown): void {
    // An Error survives the wire as a plain object; anything else is passed on.
    const detail = extra instanceof Error
      ? { name: extra.name, message: extra.message, stack: extra.stack }
      : extra
    const consoleLine = `[open-with] ${message}`
    if (level === 'error') console.error(consoleLine, detail)
    else if (level === 'warn') console.warn(consoleLine, detail)
    else console.log(consoleLine, detail)
    const body: OpenWithLogPayload = {
      level, message,
      ...(detail === undefined ? {} : { extra: detail }),
    }
    void this.fetcher(OPEN_WITH_LOG_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      // Swallows an unreachable host: the console mirror already carried the line.
    })
  }
}
