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
/** GET the built-in open-in-app enablement; POST toggles one half. */
export declare const OPEN_WITH_BUILTINS_PATH = "/open-with/builtins";
/** Browser-relative form of {@link OPEN_WITH_BUILTINS_PATH}. */
export declare const OPEN_WITH_BUILTINS_ROUTE: string;
/** Directory this plugin owns inside the active profile directory. */
export declare const OPEN_WITH_DIR_NAME = "open-with";
/** Settings document filename inside {@link OPEN_WITH_DIR_NAME}. */
export declare const OPEN_WITH_SETTINGS_FILENAME = "settings.json";
/** Host log filename inside {@link OPEN_WITH_DIR_NAME}. */
export declare const OPEN_WITH_LOG_FILENAME = "host.log";
/** Which half of DSH's own "open in app" feature a toggle addresses. */
export type OpenWithBuiltinKey = 'host' | 'client';
/** One built-in plugin half this settings page can switch on or off. */
export interface OpenWithBuiltinSpec {
    readonly key: OpenWithBuiltinKey;
    /** Module specifier the Loader entry imports; matched against the inventory. */
    readonly moduleName: string;
}
/**
 * The two halves of DSH's own "open in app" feature.
 *
 * Switching both off hands the session-header capsule to this plugin without
 * uninstalling anything: the host half owns the `/open-in-app` routes and the
 * client half owns the capsule parked in the utilities seat.
 */
export declare const OPEN_WITH_BUILTINS: readonly OpenWithBuiltinSpec[];
/** Observed state of one built-in plugin half. */
export interface OpenWithBuiltinState {
    readonly key: OpenWithBuiltinKey;
    readonly moduleName: string;
    /** False when the running profile loads no entry importing this module. */
    readonly present: boolean;
    /** Effective Loader enablement; false whenever `present` is false. */
    readonly enabled: boolean;
    /** True when the profile control cannot address this entry. */
    readonly readOnly: boolean;
    /** Why it cannot, when it cannot: a protected management bundle or a row the patch cannot target. */
    readonly readOnlyReason?: 'management-required' | 'unaddressable';
}
/** GET response: whether toggling is possible here, plus both built-in rows. */
export interface OpenWithBuiltinsPayload {
    /** False when the host exposes no plugin manager, so nothing can be toggled. */
    readonly available: boolean;
    /**
     * True when the browser half is newer than the host half: the route answered
     * 404, which only happens before the host plugin is reloaded.
     */
    readonly stale?: boolean;
    readonly entries: readonly OpenWithBuiltinState[];
}
/** POST body: switch one built-in half on or off. */
export interface OpenWithBuiltinTogglePayload {
    readonly key: OpenWithBuiltinKey;
    readonly enabled: boolean;
}
/** Built-in launcher kinds dispatched by `./launch.ts` (Windows only). */
export type LaunchTarget = 'code' | 'cmd' | 'powershell' | 'explorer';
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
export declare const ORDER_MIN = -100000;
/** Inclusive upper bound accepted for a persisted slot order. */
export declare const ORDER_MAX = 100000;
/** One menu entry: a built-in preset or a user-defined launcher. */
export interface OpenWithItem {
    readonly id: string;
    readonly name: string;
    /** Launcher path: a bare command name for presets, an absolute path for custom items. */
    readonly path: string;
    /** Presets cannot be edited or removed. */
    readonly preset: boolean;
    /** Present on presets only; selects the built-in spawn recipe. */
    readonly target?: LaunchTarget;
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
/** Settings-route response: the stored document plus the resolved preset launchers. */
export interface OpenWithSettingsPayload {
    readonly settings: OpenWithSettings;
    /** Preset target → resolved executable path; an unresolved preset maps to an empty string. */
    readonly presetPaths: Readonly<Record<string, string>>;
}
/**
 * One entry already registered in a session-header seat this plugin can occupy.
 *
 * Read from the browser-side slot ledger so the settings page can show where
 * this plugin's capsule lands relative to the components around it.
 */
export interface OpenWithPeer {
    /** Seat the entry occupies. */
    readonly slot: Placement;
    /** Registration id. */
    readonly id: string;
    /** List order: a smaller value sits further left. */
    readonly order: number;
    /** Coarse bucket applied before `order`. */
    readonly priority: number;
    /** Diagnostics label of the registrant, when it declared one. */
    readonly registrant?: string;
    /** True for this plugin's own entry. */
    readonly self: boolean;
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
/** The built-in presets, in default menu order. */
export declare const PRESET_ITEMS: readonly OpenWithItem[];
/** Every preset target id, in preset order. */
export declare const PRESET_TARGETS: readonly LaunchTarget[];
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
 * every field is validated independently: a malformed item is dropped, every
 * missing preset is restored (the settings page cannot otherwise resurrect
 * one), a stale `currentId` falls back to the first item, an unknown
 * `placement` falls back to the default, and an out-of-range `order` is
 * clamped (a missing one takes {@link DEFAULT_ORDER}).
 * @param raw - the settings file parsed as JSON, or null when it does not exist.
 * @returns a document that is safe to persist and render.
 */
export declare function normalizeSettings(raw: unknown): OpenWithSettings;
