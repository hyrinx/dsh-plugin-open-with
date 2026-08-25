/**
 * Browser-side plugin: injects an "Open in VS Code" button into the
 * conversation session header actions slot. On click, calls the host-side
 * RPC channel `/open-vscode` to spawn VS Code at the workspace directory.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type OpenVscodeKey } from './locales.ts';
export type { OpenVscodeButtonProps, OpenVscodeInjected } from './OpenVscodeButton.tsx';
export type { OpenVscodeKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Open VS Code button copy. */
        openVscode: OpenVscodeKey;
    }
}
/** Services required: slots for UI registration, locale for i18n, connection for RPC. */
export declare const inject: string[];
/**
 * Register the i18n dictionaries and inject the button into the conversation
 * session header actions slot.
 * @param ctx - Client root context.
 */
export declare function apply(ctx: ClientContext): void;
