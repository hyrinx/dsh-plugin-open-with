import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api';
/** Registration-side business face: the launch callback. */
export interface OpenVscodeInjected {
    /** Call the host to spawn VS Code at the given directory. */
    launch: (cwd: string) => Promise<RpcResult<unknown>>;
}
/** Full component props: runtime share + locale + inject face. */
export type OpenVscodeButtonProps = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<'openVscode'> & InjectFace<OpenVscodeInjected>;
/**
 * Render the Open in VS Code button.
 * @param props - composed slot props.
 * @returns the button element.
 */
export declare function OpenVscodeButton({ sessionId, useSessions, useWorkspaces, launch, t, }: OpenVscodeButtonProps): import("react").JSX.Element;
