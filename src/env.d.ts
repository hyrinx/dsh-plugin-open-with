/**
 * DSH 外部模块类型桩。
 *
 * 作为外部插件，dsh-plugin-open-with 不安装 DSH monorepo 内部包。
 * 本文件声明这些模块的存在，避免 tsc 报 "Cannot find module"。
 * 类型用 any 而非精确建模，因为 DSH API 可能在版本间变化，
 * 而外部插件无法跟随 monorepo 同步更新类型定义。
 *
 * 这是 TypeScript 生态中的标准做法，类似 Vite 的 env.d.ts、
 * 或 CSS Modules 的 *.module.css 声明文件。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type $TS_FIXME = any

declare module '@deepseek-ai/cordis' {
  export type Context = $TS_FIXME
}

declare module '@deepseek-ai/dsh-subprocess' {
  // 仅声明模块存在，具体类型由运行时决定
}

declare module '@deepseek-ai/dsh-client-connection' {
  export type Connection = $TS_FIXME
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  export type ClientContext = $TS_FIXME
}

declare module '@deepseek-ai/dsh-client-locale/client' {
  // 仅用于模块扩充
}

declare module '@deepseek-ai/dsh-client-connection/client' {
  // 仅用于模块扩充
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  // 仅用于模块扩充
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  export interface LocaleNamespaceMap {}
  export type Slots = $TS_FIXME
  export type Sessions = $TS_FIXME
  export type PropsLocale<T extends string = string> = { t: (key: string) => string }
  export type PropsRuntime<T extends string = string> = { sessionId: string }
  export type InjectFace<T> = T
}

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  export function IconChevronDownOutline14(props: $TS_FIXME): JSX.Element
  export function useDismissOnOutsidePointer(...args: $TS_FIXME[]): void
}

declare module '@deepseek-ai/dsh-host-apiproxy/api' {
  export interface RpcResult<T = unknown> {
    ok: boolean
    value?: T
    error?: { code: string; message: string }
  }
}