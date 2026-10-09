/**
 * Windows icon extraction for the icon route.
 *
 * The resolved launcher's associated icon is extracted as a PNG by a
 * generated PowerShell script run with `-File` and positional arguments, so
 * spaces, quotes, and non-ASCII characters in the executable path never enter
 * the command line's parsing. `ExtractAssociatedIcon` yields 32px, the most
 * the stock .NET surface gives without a native addon.
 *
 * Every failure resolves null and the route answers 404, which the browser
 * renders as the generic fallback glyph.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { OpenWithLogger } from './logger.ts'

/** Icon-extraction script. Positional args keep the path out of the parser. */
const EXTRACT_ICON_PS1 = [
  'param([string]$Source, [string]$Target)',
  '$ErrorActionPreference = "Stop"',
  'Add-Type -AssemblyName System.Drawing',
  '$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($Source)',
  'if ($null -eq $icon) { exit 1 }',
  '$bitmap = $icon.ToBitmap()',
  '$bitmap.Save($Target, [System.Drawing.Imaging.ImageFormat]::Png)',
  '',
].join('\n')

/** Per-command deadline for one PowerShell extraction. */
const EXTRACT_TIMEOUT_MS = 15_000

/** Collected-output ceiling; a PNG is far smaller, and stderr is short. */
const MAX_OUTPUT_BYTES = 1024 * 1024

/**
 * Extract one executable's associated icon as PNG bytes.
 * @param ctx - host plugin context.
 * @param exePath - the resolved launcher (`.exe`, or any file the shell has an association for).
 * @param logger - plugin logger.
 * @returns the PNG bytes, or null when this host cannot extract one.
 */
export async function extractIconPng(
  ctx: Context,
  exePath: string,
  logger: OpenWithLogger,
): Promise<Buffer | null> {
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-open-with-'))
  try {
    const script = join(workDir, 'extract-icon.ps1')
    const outPng = join(workDir, 'icon.png')
    await writeFile(script, EXTRACT_ICON_PS1, 'utf8')
    const handle = ctx.subprocess.spawn({
      argv: [
        'powershell.exe', '-NoProfile', '-NonInteractive',
        '-ExecutionPolicy', 'Bypass', '-File', script, exePath, outPng,
      ],
      cwd: workDir,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: MAX_OUTPUT_BYTES },
        stderr: { maxBytes: MAX_OUTPUT_BYTES },
      },
      graceMs: EXTRACT_TIMEOUT_MS,
    })
    const outcome = await handle.done
    const stderr = handle.collected.stderr?.readFrom(0).text.trim() ?? ''
    if (outcome.exitCode !== 0) {
      logger.warn('icon extraction failed', { exePath, exitCode: outcome.exitCode, stderr })
      return null
    }
    try {
      return await readFile(outPng)
    } catch {
      // Swallows a script run that exited 0 without writing the output file.
      return null
    }
  } catch (err) {
    logger.error('icon extraction threw', err)
    return null
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
