/**
 * Profile-scoped storage for this plugin.
 *
 * Settings and the host log live in `profile/<mode>/open-with`, the profile
 * directory the DSH launcher publishes as `ctx.profileContext.dir`, so they
 * travel with the profile that loaded the plugin. A composition that was not
 * launched from a profile (a bare test harness) falls back to
 * `$DSH_HOME/profiles/default/open-with` rather than scattering files.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  OPEN_WITH_DIR_NAME, OPEN_WITH_LOG_FILENAME, OPEN_WITH_SETTINGS_FILENAME,
  normalizeSettings, type OpenWithSettings,
} from './shared.ts'

/**
 * Directory owning this plugin's settings and log inside the active profile.
 * @param ctx - host plugin context.
 * @returns the absolute directory (not created here).
 */
export function openWithDirOf(ctx: Context): string {
  const profileDir: unknown = ctx.profileContext?.dir
  if (typeof profileDir === 'string' && profileDir.length > 0) {
    return join(profileDir, OPEN_WITH_DIR_NAME)
  }
  // A composition with no profile (a bare test harness) gets the same layout
  // under $DSH_HOME rather than scattering files next to the working directory.
  const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(home, 'profiles', 'default', OPEN_WITH_DIR_NAME)
}

/** Settings document path inside one plugin directory. */
export function settingsFileOf(dir: string): string {
  return join(dir, OPEN_WITH_SETTINGS_FILENAME)
}

/** Host log path inside one plugin directory. */
export function logFileOf(dir: string): string {
  return join(dir, OPEN_WITH_LOG_FILENAME)
}

/**
 * Read and normalize the settings document.
 * @param file - absolute settings path.
 * @returns the normalized document, or null when the file does not exist or is unreadable.
 */
export function readSettings(file: string): OpenWithSettings | null {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    // Swallows ENOENT: an absent file is exactly the "no settings yet" case.
    return null
  }
  try {
    return normalizeSettings(JSON.parse(text) as unknown)
  } catch {
    // Swallows malformed JSON: a hand-edited broken file falls back to defaults.
    return null
  }
}

/**
 * Replace the settings document atomically (write-then-rename, so a crash
 * mid-write cannot leave a truncated file).
 * @param file - absolute settings path.
 * @param settings - the document to persist; normalized before writing.
 * @returns the normalized document that was written.
 */
export function writeSettings(file: string, settings: unknown): OpenWithSettings {
  const normalized = normalizeSettings(settings)
  mkdirSync(dirname(file), { recursive: true })
  const temporary = `${file}.tmp`
  writeFileSync(temporary, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  renameSync(temporary, file)
  return normalized
}
