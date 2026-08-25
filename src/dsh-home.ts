/**
 * DSH 规范 home 路径解析器。
 *
 * 优先级（与 @deepseek-ai/dsh-home-paths 一致）：
 *   explicit configured path > $DSH_HOME > ~/.dsh
 *
 * 作为外部插件无法直接 import @deepseek-ai/dsh-home-paths，
 * 但遵循与其完全相同的解析逻辑。
 * @module dsh-plugin-open-with/dsh-home
 */

import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'

/** DSH home 目录名（与 @deepseek-ai/dsh-home-paths 的 DSH_HOME_DIR_NAME 一致）。 */
export const DSH_HOME_DIR_NAME = '.dsh'

/** 覆盖默认 home 的环境变量名（与 @deepseek-ai/dsh-home-paths 的 DSH_HOME_ENV 一致）。 */
export const DSH_HOME_ENV = 'DSH_HOME'

/**
 * 展开受支持的波浪号前缀到操作系统 home 目录。
 * @param p - 可能以 `~`、`~/` 或 `~\` 开头的配置路径。
 * @returns 展开后的路径，或当没有受支持的前缀时返回原始值。
 */
export function expandHomePath(p: string): string {
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~' + sep)) return join(homedir(), p.slice(2))
  return p
}

/**
 * 解析 DSH 数据根目录。
 *
 * 优先级（从高到低）：显式配置路径、`$DSH_HOME` 环境变量、`~/.dsh`。
 * 空或仅含空白的 `$DSH_HOME` 被视为未设置，这样空白覆盖绝不会
 * 把 home 解析到当前工作目录。
 *
 * @param configured - 显式 home 覆盖，优先级最高。
 * @param env - 环境变量映射，默认使用 `process.env`。
 * @returns 规范化后的绝对路径。
 */
export function resolveDshHome(
  configured?: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const fromEnv = env[DSH_HOME_ENV]
  const selected =
    configured ??
    (fromEnv !== undefined && fromEnv.trim().length > 0
      ? fromEnv
      : join(homedir(), DSH_HOME_DIR_NAME))
  return resolve(expandHomePath(selected))
}

/**
 * 在 DSH home 下拼接子路径。
 * @param segments - 追加到 DSH home 后的路径段。
 * @returns 规范化后的绝对拼接路径。
 */
export function dshHomePath(...segments: string[]): string {
  return join(resolveDshHome(), ...segments)
}