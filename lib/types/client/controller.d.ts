/**
 * Browser-side HTTP carrier for the capsule button and the settings page.
 *
 * Every read, write, and launch is one request against the host routes; there
 * is no client-side cache, so the menu and the settings page always show the
 * document the host actually holds.
 */
import { type OpenWithBuiltinsPayload, type OpenWithSettings, type OpenWithSettingsPayload } from '../shared.ts';
type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
/** Log levels the log route accepts. */
export type OpenWithLogLevel = 'info' | 'warn' | 'error';
export declare class OpenWithController {
    private readonly fetcher;
    /**
     * @param fetcher - HTTP carrier; injectable so tests can drive it directly.
     */
    constructor(fetcher?: Fetch);
    /**
     * Read the settings document.
     * @returns the host's normalized document.
     */
    load(): Promise<OpenWithSettingsPayload>;
    /**
     * Replace the settings document.
     * @param settings - the document to persist.
     * @returns the host's normalized document.
     */
    save(settings: OpenWithSettings): Promise<OpenWithSettings>;
    /**
     * Launch one item on one workspace directory.
     * @param target - item id from the settings document.
     * @param path - the session's absolute workspace directory.
     * @returns after the host accepted the launch; rejects on any failure.
     */
    launch(target: string, path: string): Promise<void>;
    /**
     * Read the enablement of DSH's own open-in-app pair.
     * @returns the merged state, or `available: false` when this profile exposes no plugin manager.
     */
    loadBuiltins(): Promise<OpenWithBuiltinsPayload>;
    /**
     * Switch both built-in halves on or off together.
     * @param enabled - whether the pair should run.
     * @returns the host's refreshed state.
     */
    setBuiltin(enabled: boolean): Promise<OpenWithBuiltinsPayload>;
    /**
     * Mirror one line into the browser console and the host log file.
     * @param level - log level.
     * @param message - the line.
     * @param extra - optional structured detail.
     */
    log(level: OpenWithLogLevel, message: string, extra?: unknown): void;
}
export {};
