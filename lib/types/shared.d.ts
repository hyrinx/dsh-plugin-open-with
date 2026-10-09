/**
 * Route paths, wire payloads, and the settings schema shared verbatim by the
 * host half (`./index.ts` and its siblings) and the browser half
 * (`./client/index.ts`).
 *
 * Browser-safe: constants, types, and pure helpers only — no node imports, so
 * the same module inlines into both bundles. Every route carries the absolute
 * pathname the host registers beside the document-relative form the browser
 * addresses (`*_ROUTE`), because one composition may serve the app under a
 * sub-path.
 */
/** GET the normalized settings; POST replaces them. */
export declare const OPEN_WITH_SETTINGS_PATH = "/open-with/settings";
/** Browser-relative form of {@link OPEN_WITH_SETTINGS_PATH}. */
export declare const OPEN_WITH_SETTINGS_ROUTE: string;
/** GET prefix serving one item's icon as PNG bytes (`<prefix>/<id>`). */
export declare const OPEN_WITH_ICON_PREFIX_PATH = "/open-with/icon";
/** Browser-relative form of {@link OPEN_WITH_ICON_PREFIX_PATH}. */
export declare const OPEN_WITH_ICON_PREFIX_ROUTE: string;
/** POST one launch of one item on one workspace directory. */
export declare const OPEN_WITH_OPEN_PATH = "/open-with/open";
/** Browser-relative form of {@link OPEN_WITH_OPEN_PATH}. */
export declare const OPEN_WITH_OPEN_ROUTE: string;
/** POST one browser-side log line into the host log file. */
export declare const OPEN_WITH_LOG_PATH = "/open-with/log";
/** Browser-relative form of {@link OPEN_WITH_LOG_PATH}. */
export declare const OPEN_WITH_LOG_ROUTE: string;
/** Directory this plugin owns inside the active profile directory. */
export declare const OPEN_WITH_DIR_NAME = "open-with";
/** Settings document filename inside {@link OPEN_WITH_DIR_NAME}. */
export declare const OPEN_WITH_SETTINGS_FILENAME = "settings.json";
/** Host log filename inside {@link OPEN_WITH_DIR_NAME}. */
export declare const OPEN_WITH_LOG_FILENAME = "host.log";
/** Session-header slot the capsule button mounts into. */
export type Placement = 'actions' | 'utilities';
/** Default placement: the right-hand utilities cluster, beside DSH's own controls. */
export declare const DEFAULT_PLACEMENT: Placement;
/**
 * Default slot order.
 *
 * List slots sort by `priority` and then by `order` ascending, so a smaller
 * value sits further left. DSH's own "open in app" capsule registers at -10 in
 * the utilities seat; 0 therefore lands just to its right.
 */
export declare const DEFAULT_ORDER = 0;
/** Inclusive lower bound accepted for a persisted slot order. */
export declare const ORDER_MIN = -100;
/** Inclusive upper bound accepted for a persisted slot order. */
export declare const ORDER_MAX = 100;
/** One menu entry: all items are treated uniformly. */
export interface OpenWithItem {
    readonly id: string;
    readonly name: string;
    /** Launcher path: an absolute path or a bare command name resolvable via PATH. */
    readonly path: string;
    /**
     * Whether the session directory is handed to the launcher as an argument.
     * Absent means yes, so a launcher that wants no directory (or finds the
     * folder itself) is the only case that stores this.
     */
    readonly passCwd?: boolean;
}
/** The persisted settings document. */
export interface OpenWithSettings {
    /** Id of the item the primary half of the split button launches. */
    readonly currentId: string;
    readonly items: readonly OpenWithItem[];
    /** Ids excluded from the capsule menu; an absent id is visible. */
    readonly hiddenIds: readonly string[];
    readonly placement: Placement;
    /**
     * Slot order within the placed seat: a smaller value sits further left.
     * DSH's own "open in app" capsule registers at -10 in the utilities seat.
     */
    readonly order: number;
}
/** Settings-route response: the stored document. */
export interface OpenWithSettingsPayload {
    readonly settings: OpenWithSettings;
}
/** Open-route request body. */
export interface OpenWithOpenPayload {
    /** Item id from the settings document. */
    readonly target: string;
    /** Absolute workspace directory to open. */
    readonly path: string;
}
/** Log-route request body. */
export interface OpenWithLogPayload {
    readonly level: 'info' | 'warn' | 'error';
    readonly message: string;
    readonly extra?: unknown;
}
/**
 * The seed menu entries, in default order.
 *
 * These carry no privileges. Their `path` is a bare command name only as a
 * starting point: the host resolves it into an absolute executable path the
 * first time it writes a document, and from then on every entry is an ordinary
 * item the settings page can rename, re-target, hide, and remove.
 */
export declare const DEFAULT_ITEMS: readonly OpenWithItem[];
/** The settings document used before one has ever been written. */
export declare function defaultSettings(): OpenWithSettings;
/**
 * Narrow one persisted placement value.
 * @param value - any value read from the settings file.
 * @returns the value when legal, else null.
 */
export declare function normalizePlacement(value: unknown): Placement | null;
/**
 * Coerce one persisted slot order into the accepted range.
 * @param value - any value read from the settings file.
 * @returns a rounded, clamped integer, or null when the value is unusable.
 */
export declare function normalizeOrder(value: unknown): number | null;
/**
 * Coerce any persisted value into a complete settings document.
 *
 * The file may come from an older version, be hand-edited, or be truncated, so
 * every field is validated independently: a malformed item is dropped, a stale
 * `currentId` falls back to the first item, an unknown `placement` falls back to
 * the default, and an out-of-range `order` is clamped (a missing one takes
 * {@link DEFAULT_ORDER}).
 *
 * Missing items are never restored: every entry is a plain item, so removing
 * one has to survive the next read. Only a document that does not exist at all
 * falls back to {@link defaultSettings}, which the host seeds.
 * @param raw - the settings file parsed as JSON, or null when it does not exist.
 * @returns a document that is safe to persist and render.
 */
export declare function normalizeSettings(raw: unknown): OpenWithSettings;
