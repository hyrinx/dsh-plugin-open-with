/**
 * Capsule split button: the left half launches the current item, the right
 * half opens a picker menu.
 *
 * The menu is DSH's `Menu` primitive with `portal` enabled, so the list mounts
 * on `document.body` and is positioned from the anchor rect — the session
 * header's `container-type` and stacking context would otherwise clip it.
 *
 * Menu contents are re-read from the host every time the menu opens, so a
 * settings change is visible without a page reload.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { OpenWithSettingsPayload } from '../shared.ts';
import type { OpenWithLogLevel } from './controller.ts';
/** Session-header slots this button can mount into, chosen by the settings page. */
export type HeaderActionSlot = 'conversation.session.header.actions' | 'conversation.session.header.utilities';
/** Host capabilities supplied to the button through its slot registration. */
export interface OpenWithInjected {
    /** Read the settings document (and its resolved preset paths) from the host. */
    getSettings: () => Promise<OpenWithSettingsPayload>;
    /** Launch one item on the session's workspace directory. */
    launch: (target: string, path: string) => Promise<void>;
    /** The session's workspace directory, or undefined when the session is unknown. */
    getCwd: (sessionId: string) => string | undefined;
    /** Mirror one line into the browser console and the host log file. */
    log: (level: OpenWithLogLevel, message: string, extra?: unknown) => void;
    /** Document-relative URL of one item's icon. */
    iconUrl: (id: string) => string;
}
export type OpenWithButtonProps = PropsRuntime<HeaderActionSlot> & PropsLocale<'openWith'> & InjectFace<OpenWithInjected>;
/**
 * Render the split button.
 * @param props - session identity, localized copy, and the injected host face.
 * @returns the control, or null while the first settings read is in flight.
 */
export declare function OpenWithButton({ sessionId, getSettings, launch, getCwd, log, iconUrl, t, }: OpenWithButtonProps): import("react").JSX.Element;
