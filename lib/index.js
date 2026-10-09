import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
//#region src/shared.ts
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
const OPEN_WITH_SETTINGS_PATH = "/open-with/settings";
OPEN_WITH_SETTINGS_PATH.slice(1);
/** GET prefix serving one item's icon as PNG bytes (`<prefix>/<id>`). */
const OPEN_WITH_ICON_PREFIX_PATH = "/open-with/icon";
OPEN_WITH_ICON_PREFIX_PATH.slice(1);
/** POST one launch of one item on one workspace directory. */
const OPEN_WITH_OPEN_PATH = "/open-with/open";
OPEN_WITH_OPEN_PATH.slice(1);
/** POST one browser-side log line into the host log file. */
const OPEN_WITH_LOG_PATH = "/open-with/log";
OPEN_WITH_LOG_PATH.slice(1);
/** Directory this plugin owns inside the active profile directory. */
const OPEN_WITH_DIR_NAME = "open-with";
/** Settings document filename inside {@link OPEN_WITH_DIR_NAME}. */
const OPEN_WITH_SETTINGS_FILENAME = "settings.json";
/** Host log filename inside {@link OPEN_WITH_DIR_NAME}. */
const OPEN_WITH_LOG_FILENAME = "host.log";
/** Default placement: the right-hand utilities cluster, beside DSH's own controls. */
const DEFAULT_PLACEMENT = "utilities";
/** Inclusive lower bound accepted for a persisted slot order. */
const ORDER_MIN = -100;
/**
* The seed menu entries, in default order.
*
* These carry no privileges. Their `path` is a bare command name only as a
* starting point: the host resolves it into an absolute executable path the
* first time it writes a document, and from then on every entry is an ordinary
* item the settings page can rename, re-target, hide, and remove.
*/
const DEFAULT_ITEMS = [
	{
		id: "explorer",
		name: "Explorer",
		path: "explorer"
	},
	{
		id: "cmd",
		name: "Command",
		path: "cmd",
		passCwd: false
	},
	{
		id: "powershell",
		name: "PowerShell",
		path: "powershell",
		passCwd: false
	},
	{
		id: "code",
		name: "VS Code",
		path: "code"
	}
];
/** The settings document used before one has ever been written. */
function defaultSettings() {
	return {
		currentId: DEFAULT_ITEMS[0].id,
		items: DEFAULT_ITEMS.map((item) => ({ ...item })),
		hiddenIds: [],
		placement: DEFAULT_PLACEMENT,
		order: 0
	};
}
/**
* Narrow one persisted placement value.
* @param value - any value read from the settings file.
* @returns the value when legal, else null.
*/
function normalizePlacement(value) {
	return value === "actions" || value === "utilities" ? value : null;
}
/**
* Coerce one persisted slot order into the accepted range.
* @param value - any value read from the settings file.
* @returns a rounded, clamped integer, or null when the value is unusable.
*/
function normalizeOrder(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return Math.min(100, Math.max(ORDER_MIN, Math.round(value)));
}
/** Narrow one persisted item value into a complete {@link OpenWithItem}. */
function normalizeItem(raw) {
	if (raw === null || typeof raw !== "object") return null;
	const source = raw;
	if (typeof source.id !== "string" || source.id.length === 0) return null;
	if (typeof source.name !== "string") return null;
	return {
		id: source.id,
		name: source.name,
		path: typeof source.path === "string" ? source.path : "",
		...source.passCwd === false ? { passCwd: false } : {}
	};
}
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
function normalizeSettings(raw) {
	if (raw === null || typeof raw !== "object") return defaultSettings();
	const source = raw;
	const items = Array.isArray(source.items) ? source.items.map(normalizeItem).filter((item) => item !== null) : [];
	return {
		currentId: typeof source.currentId === "string" && items.some((item) => item.id === source.currentId) ? source.currentId : items[0]?.id ?? "",
		items,
		hiddenIds: Array.isArray(source.hiddenIds) ? source.hiddenIds.filter((id) => typeof id === "string") : [],
		placement: normalizePlacement(source.placement) ?? "utilities",
		order: normalizeOrder(source.order) ?? 0
	};
}
//#endregion
//#region src/storage.ts
/**
* Profile-scoped storage for this plugin.
*
* Settings and the host log live in `profile/<mode>/open-with`, the profile
* directory the DSH launcher publishes as `ctx.profileContext.dir`, so they
* travel with the profile that loaded the plugin. A composition that was not
* launched from a profile (a bare test harness) falls back to
* `$DSH_HOME/profiles/default/open-with` rather than scattering files.
*/
/**
* Directory owning this plugin's settings and log inside the active profile.
* @param ctx - host plugin context.
* @returns the absolute directory (not created here).
*/
function openWithDirOf(ctx) {
	const profileDir = ctx.profileContext?.dir;
	if (typeof profileDir === "string" && profileDir.length > 0) return join(profileDir, OPEN_WITH_DIR_NAME);
	const home = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
	return join(home, "profiles", "default", OPEN_WITH_DIR_NAME);
}
/** Settings document path inside one plugin directory. */
function settingsFileOf(dir) {
	return join(dir, OPEN_WITH_SETTINGS_FILENAME);
}
/** Host log path inside one plugin directory. */
function logFileOf(dir) {
	return join(dir, OPEN_WITH_LOG_FILENAME);
}
/**
* Read and normalize the settings document.
* @param file - absolute settings path.
* @returns the normalized document, or null when the file does not exist or is unreadable.
*/
function readSettings(file) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return null;
	}
	try {
		return normalizeSettings(JSON.parse(text));
	} catch {
		return null;
	}
}
/**
* Replace the settings document atomically (write-then-rename, so a crash
* mid-write cannot leave a truncated file).
* @param file - absolute settings path.
* @param settings - the document to persist; normalized before writing.
* @returns the normalized document that was written.
*/
function writeSettings(file, settings) {
	const normalized = normalizeSettings(settings);
	mkdirSync(dirname(file), { recursive: true });
	const temporary = `${file}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
	renameSync(temporary, file);
	return normalized;
}
//#endregion
//#region src/logger.ts
/**
* Host logging for this plugin.
*
* One file, `profile/<mode>/open-with/host.log`, truncated on every plugin
* load so it always describes the current session. Lines are mirrored to the
* composition logger (`ctx.logger('open-with')`), which is where DSH's own
* console exporter picks them up; the file exists because the console is not
* readable after the fact.
*
* Writes never throw: a failing log must not take the plugin down.
*/
/** Render one value for a log line; errors keep their stack. */
function stringify(value) {
	if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}
/**
* Create the logger bound to one log file.
* @param ctx - host plugin context (its composition logger is the console mirror).
* @param logFile - absolute log path; its directory is created and the file truncated.
* @returns the logger surface used by the rest of the host half.
*/
function createLogger(ctx, logFile) {
	const scoped = typeof ctx.logger === "function" ? ctx.logger("open-with") : void 0;
	try {
		mkdirSync(dirname(logFile), { recursive: true });
		writeFileSync(logFile, "", "utf8");
	} catch {}
	const write = (level, scope, message, extra) => {
		const rendered = extra === void 0 ? "" : ` ${stringify(extra)}`;
		const line = `[${level}] [${scope}] ${message}${rendered}\n`;
		try {
			appendFileSync(logFile, line, "utf8");
		} catch {}
		scoped?.[level](`[${scope}] ${message}${rendered}`);
	};
	return {
		info: (message, extra) => {
			write("info", "host", message, extra);
		},
		warn: (message, extra) => {
			write("warn", "host", message, extra);
		},
		error: (message, extra) => {
			write("error", "host", message, extra);
		},
		client: (level, message, extra) => {
			write(level, "client", message, extra);
		}
	};
}
//#endregion
//#region src/icons.ts
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
/** Icon-extraction script. Positional args keep the path out of the parser. */
const EXTRACT_ICON_PS1 = [
	"param([string]$Source, [string]$Target)",
	"$ErrorActionPreference = \"Stop\"",
	"Add-Type -AssemblyName System.Drawing",
	"$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($Source)",
	"if ($null -eq $icon) { exit 1 }",
	"$bitmap = $icon.ToBitmap()",
	"$bitmap.Save($Target, [System.Drawing.Imaging.ImageFormat]::Png)",
	""
].join("\n");
/** Per-command deadline for one PowerShell extraction. */
const EXTRACT_TIMEOUT_MS = 15e3;
/** Collected-output ceiling; a PNG is far smaller, and stderr is short. */
const MAX_OUTPUT_BYTES$1 = 1048576;
/**
* Extract one executable's associated icon as PNG bytes.
* @param ctx - host plugin context.
* @param exePath - the resolved launcher (`.exe`, or any file the shell has an association for).
* @param logger - plugin logger.
* @returns the PNG bytes, or null when this host cannot extract one.
*/
async function extractIconPng(ctx, exePath, logger) {
	const workDir = await mkdtemp(join(tmpdir(), "dsh-open-with-"));
	try {
		const script = join(workDir, "extract-icon.ps1");
		const outPng = join(workDir, "icon.png");
		await writeFile(script, EXTRACT_ICON_PS1, "utf8");
		const handle = ctx.subprocess.spawn({
			argv: [
				"powershell.exe",
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				script,
				exePath,
				outPng
			],
			cwd: workDir,
			stdio: {
				stdin: "ignore",
				stdout: { maxBytes: MAX_OUTPUT_BYTES$1 },
				stderr: { maxBytes: MAX_OUTPUT_BYTES$1 }
			},
			graceMs: EXTRACT_TIMEOUT_MS
		});
		const outcome = await handle.done;
		const stderr = handle.collected.stderr?.readFrom(0).text.trim() ?? "";
		if (outcome.exitCode !== 0) {
			logger.warn("icon extraction failed", {
				exePath,
				exitCode: outcome.exitCode,
				stderr
			});
			return null;
		}
		try {
			return await readFile(outPng);
		} catch {
			return null;
		}
	} catch (err) {
		logger.error("icon extraction threw", err);
		return null;
	} finally {
		await rm(workDir, {
			recursive: true,
			force: true
		}).catch(() => {});
	}
}
//#endregion
//#region src/launch.ts
/**
* Windows launch recipe, initial-path resolution, and subprocess dispatch.
*
* Every item — terminal, editor, file manager, or a user's own entry — takes
* one shape: the program path, optionally followed by the directory to open.
* Nothing about an item's origin changes how it starts.
*
* The whole command runs behind `cmd /c start` rather than `cmd /c <exe>`:
* `cmd /c` strips a leading quote from the command string, truncating paths
* like `C:\Program Files\...`; with `start` as the command word cmd leaves the
* quoting alone, and `start` itself treats the first `""` as the window title
* and the rest as program plus arguments.
*
* Folders reach File Explorer through `start` rather than a direct
* `explorer.exe` spawn: an explorer spawned straight from this process inherits
* its stdio pipes and window flags and exits 1 without ever showing a window,
* whereas `start` hands the directory to the shell's own opener, which is how
* DSH's own open-in-app opens folders.
*
* A launch that has been handed to `start` is fire-and-forget, so the plugin
* only records the first-exit diagnostics instead of holding a successful
* launch open.
*/
/** Collected-output ceiling for a launch command; diagnostics are short. */
const MAX_OUTPUT_BYTES = 65536;
/** Early-failure watch window: a command still running past it counts as launched. */
const LAUNCH_WATCH_MS = 5e3;
/**
* Environment tombstone applied to every launch.
*
* A DSH host shipped as an Electron shell hands `ELECTRON_RUN_AS_NODE` down to
* its children. An Electron launcher that inherits it runs as a bare Node
* process: VS Code starts, exits 0, and never draws a window — which reads in
* the log exactly like a successful launch. `undefined` is the subprocess
* provider's tombstone, removing just this entry from the child while the rest
* of the ambient environment is layered as usual.
*/
const LAUNCH_ENV = { ELECTRON_RUN_AS_NODE: void 0 };
/**
* Absolute path of a program that ships with Windows.
* @param name - the bare command name.
* @returns the absolute executable path, or null when this is not one of them.
*/
function systemLauncherPath(name) {
	const windir = process.env.windir ?? "C:\\Windows";
	switch (name) {
		case "cmd": return `${windir}\\System32\\cmd.exe`;
		case "powershell": return `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
		case "explorer": return `${windir}\\explorer.exe`;
		default: return null;
	}
}
/**
* Resolve a bare command name to the GUI executable it stands for.
*
* `resolveExecutable('code')` hits the CLI wrapper (`bin\code.cmd`), and
* `start`-ing a `.cmd` raises a console window before the GUI appears; the real
* GUI executable sits in the same directory as the wrapper or the one above.
* Windows paths are case-insensitive, so probing for `<stem>.exe` finds
* `Code.exe` from `code.cmd`.
* @param ctx - host plugin context.
* @param name - the bare command name.
* @returns the resolved executable path.
*/
async function resolveGuiExecutable(ctx, name) {
	const resolved = await ctx.subprocess.resolveExecutable(name);
	const extension = extname(resolved).toLowerCase();
	if (extension === ".cmd" || extension === ".bat") {
		const stem = basename(resolved, extname(resolved));
		for (const directory of [dirname(resolved), dirname(dirname(resolved))]) {
			const candidate = join(directory, `${stem}.exe`);
			if (existsSync(candidate)) return candidate;
		}
	}
	return resolved;
}
/**
* Resolve a stored item path into the absolute executable it stands for.
*
* The settings document can hold either an absolute path (custom items, and the
* presets once seeded) or a bare command name (a preset that came back through a
* default restore, or a hand-edited document). Callers that need a real file —
* icon extraction, and launchers that must not rely on the shell's PATH lookup —
* consistently resolve through here, so every item is treated alike. A name that
* cannot be resolved is returned unchanged: `start` still finds it on PATH, and
* the settings page is where the user corrects it.
* @param ctx - host plugin context.
* @param path - the item's configured launcher path.
* @returns the absolute executable path, or the input unchanged when unresolvable.
*/
async function resolveExecutable(ctx, path) {
	if (path.length === 0) return path;
	if (isAbsolute(path)) return path;
	const system = systemLauncherPath(path);
	if (system !== null) return system;
	try {
		return await resolveGuiExecutable(ctx, path);
	} catch {
		return path;
	}
}
/**
* Build the argv for one launch: `<program> [cwd]` behind `cmd /c start`.
*
* The `start` command word is what keeps a path like `C:\Program Files\...`
* intact (a bare `cmd /c <path>` strips its leading quote), and the leading
* `""` is the window title that `start` would otherwise mistake the program
* path for.
* @param program - the item's launcher path.
* @param cwd - directory to hand the launcher; omitted when it takes none.
* @returns the argv to spawn.
*/
function launchArgv(program, cwd) {
	return cwd === void 0 ? [
		"cmd",
		"/c",
		"start",
		"",
		program
	] : [
		"cmd",
		"/c",
		"start",
		"",
		program,
		cwd
	];
}
/**
* Spawn one launcher and report its first-exit diagnostics asynchronously.
*
* `SubprocessHandle` exposes no pid, so the log records the exit outcome
* rather than a process identity.
* @param ctx - host plugin context.
* @param argv - full command; `argv[0]` is the program, never shell-interpreted.
* @param cwd - the child's working directory (the session's workspace).
* @param label - log label identifying the target.
* @param logger - plugin logger.
*/
function spawnDetached(ctx, argv, cwd, label, logger) {
	const handle = ctx.subprocess.spawn({
		argv: [...argv],
		cwd,
		env: LAUNCH_ENV,
		stdio: {
			stdin: "ignore",
			stdout: { maxBytes: MAX_OUTPUT_BYTES },
			stderr: { maxBytes: MAX_OUTPUT_BYTES }
		},
		graceMs: LAUNCH_WATCH_MS
	});
	handle.done.then((outcome) => {
		const stderr = handle.collected.stderr?.readFrom(0).text.trim() ?? "";
		const stdout = handle.collected.stdout?.readFrom(0).text.trim() ?? "";
		if (outcome.exitCode !== 0 || stderr.length > 0) logger.warn("launch command finished with diagnostics", {
			label,
			exitCode: outcome.exitCode,
			stdout,
			stderr
		});
		else logger.info("launch command finished", {
			label,
			exitCode: outcome.exitCode
		});
	}).catch((err) => {
		logger.error("launch command failed to run", {
			label,
			err
		});
	});
}
/**
* Launch one item on one workspace directory.
* @param ctx - host plugin context.
* @param itemId - the item's id, for logging.
* @param itemPath - the item's configured launcher path.
* @param cwd - the session's workspace directory; always the child's working directory.
* @param passCwd - whether the directory is also handed to the launcher as its argument.
* @param logger - plugin logger.
*/
function launchItem(ctx, itemId, itemPath, cwd, passCwd, logger) {
	logger.info("launching item", {
		target: itemId,
		path: itemPath,
		cwd,
		passCwd
	});
	spawnDetached(ctx, launchArgv(itemPath, passCwd ? cwd : void 0), cwd, itemId, logger);
}
//#endregion
//#region src/index.ts
/** Cordis function-plugin name. */
const name = "open-with";
/** The route carrier, the trust fence guarding every route, and the PATH resolver. */
const inject = [
	"subprocess",
	"connection",
	"webServer"
];
/** Request bodies are tiny JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 65536;
/** JSON response (no-store: settings and launch outcomes are live facts). */
function sendJson(res, status, payload) {
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(JSON.stringify(payload));
}
/** 405 with the route's supported methods. */
function sendMethodNotAllowed(res, allow) {
	res.statusCode = 405;
	res.setHeader("allow", allow);
	res.end();
}
/** 404 for an item the icon route cannot serve. */
function sendNoIcon(res, id) {
	sendJson(res, 404, {
		code: "not-found",
		message: `no icon for item: ${id}`
	});
}
/** Collect a bounded request body as UTF-8 text; null past the ceiling (stream drained). */
async function readBoundedBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.byteLength;
		if (size > MAX_BODY_BYTES) {
			req.resume();
			return null;
		}
		chunks.push(chunk);
	}
	return Buffer.concat(chunks, size).toString("utf8");
}
/**
* Read one request body as JSON, answering the failure itself.
* @param req - the incoming request.
* @param res - the response the failure is written to.
* @returns the parsed value, or undefined when a response has already been sent.
*/
async function readJsonBody(req, res) {
	if (String(req.headers["content-type"]).split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
		sendJson(res, 415, {
			code: "unsupported-media-type",
			message: "content-type must be application/json"
		});
		return;
	}
	let text;
	try {
		text = await readBoundedBody(req);
	} catch {
		sendJson(res, 400, {
			code: "bad-request",
			message: "request body unreadable"
		});
		return;
	}
	if (text === null) {
		sendJson(res, 413, {
			code: "payload-too-large",
			message: "request body is too large"
		});
		return;
	}
	try {
		return JSON.parse(text);
	} catch {
		sendJson(res, 400, {
			code: "bad-request",
			message: "request body must be JSON"
		});
		return;
	}
}
/** Extract a string field from a parsed body, or undefined when absent/mistyped. */
function stringField(body, key) {
	if (body === null || typeof body !== "object") return void 0;
	const value = body[key];
	return typeof value === "string" ? value : void 0;
}
/** Register the settings, icon, open, and log routes behind the connection trust fence. */
function apply(ctx) {
	const directory = openWithDirOf(ctx);
	const settingsFile = settingsFileOf(directory);
	const logger = createLogger(ctx, logFileOf(directory));
	logger.info("plugin loaded", { settingsFile });
	/** Answer an untrusted/unauthenticated request; true when it was rejected. */
	const rejected = (req, res) => {
		const rejection = ctx.connection?.requestRejection?.(req);
		if (rejection === void 0) return false;
		res.statusCode = rejection;
		res.end();
		return true;
	};
	/**
	* Per-path resolution cache, keyed by the path **as stored**.
	*
	* A bare command name costs a subprocess round trip to resolve (`code`),
	* while the three system launchers are pure arithmetic, so caching removes
	* that cost from every icon request. The answer only moves if PATH changes
	* mid-session, which an already-running app would not pick up anyway.
	* {@link resolveExecutable} never rejects — it falls back to its input — so
	* a failed resolution cannot poison this map.
	*/
	const resolvedPaths = /* @__PURE__ */ new Map();
	const resolvePath = (path) => {
		let cached = resolvedPaths.get(path);
		if (cached === void 0) {
			cached = resolveExecutable(ctx, path);
			resolvedPaths.set(path, cached);
		}
		return cached;
	};
	/**
	* Fill in the absolute executable behind every bare command name.
	*
	* The document invariant is "a stored path is the file that will be started":
	* the first seed has always resolved the presets, and icon extraction and the
	* launcher both read that stored path directly. Restoring the defaults puts
	* the bare names back, so every write re-establishes it here. A name that
	* does not resolve is kept verbatim — `start` still finds it on PATH, and the
	* settings page is where the user corrects it.
	* @param settings - a normalized document.
	* @returns a copy whose items all carry resolved paths.
	*/
	const resolveSettingsPaths = async (settings) => ({
		...settings,
		items: await Promise.all(settings.items.map(async (item) => ({
			...item,
			path: await resolvePath(item.path)
		})))
	});
	/**
	* The stored document, seeding one on the very first read.
	*
	* Presets seed with bare command names; this resolves each into an absolute
	* executable path and writes it back once. Every later read returns the saved
	* document as-is — writes are what keep the paths resolved, see
	* {@link resolveSettingsPaths}.
	*/
	const loadSettings = async () => {
		const stored = readSettings(settingsFile);
		if (stored !== null) return stored;
		const seeded = await resolveSettingsPaths(defaultSettings());
		try {
			writeSettings(settingsFile, seeded);
		} catch (err) {
			logger.warn("could not persist the seeded settings", err);
		}
		return seeded;
	};
	/** Per-executable icon cache (null = resolved as unavailable). */
	const icons = /* @__PURE__ */ new Map();
	const iconOf = (executable) => {
		let cached = icons.get(executable);
		if (cached === void 0) {
			cached = extractIconPng(ctx, executable, logger);
			icons.set(executable, cached);
		}
		return cached;
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: OPEN_WITH_SETTINGS_PATH,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method === "GET") {
				sendJson(res, 200, { settings: await loadSettings() });
				return;
			}
			if (req.method !== "POST") {
				sendMethodNotAllowed(res, "GET, POST");
				return;
			}
			const body = await readJsonBody(req, res);
			if (body === void 0) return;
			if (body === null || typeof body !== "object" || !("settings" in body)) {
				sendJson(res, 400, {
					code: "bad-request",
					message: "request body must be JSON with a \"settings\" field"
				});
				return;
			}
			try {
				const requested = normalizeSettings(body.settings);
				const saved = writeSettings(settingsFile, await resolveSettingsPaths(requested));
				logger.info("settings saved", { file: settingsFile });
				sendJson(res, 200, { settings: saved });
			} catch (err) {
				logger.error("settings write failed", err);
				sendJson(res, 500, {
					code: "write-failed",
					message: "could not write the settings file"
				});
			}
		}
	}), `open-with: ${OPEN_WITH_SETTINGS_PATH}`);
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: OPEN_WITH_ICON_PREFIX_PATH,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method !== "GET") {
				sendMethodNotAllowed(res, "GET");
				return;
			}
			const pathname = new URL(String(req.url), "http://localhost").pathname;
			const id = decodeURIComponent(pathname.slice(15).replace(/^\//, ""));
			const item = (await loadSettings()).items.find((entry) => entry.id === id);
			if (item === void 0 || id.length === 0 || item.path.length === 0) {
				sendNoIcon(res, id);
				return;
			}
			const bytes = await iconOf(await resolvePath(item.path));
			if (bytes === null || bytes.length === 0) {
				sendNoIcon(res, id);
				return;
			}
			res.statusCode = 200;
			res.setHeader("content-type", "image/png");
			res.setHeader("cache-control", "no-store");
			res.end(bytes);
		}
	}), `open-with: ${OPEN_WITH_ICON_PREFIX_PATH}/<id>`);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: OPEN_WITH_OPEN_PATH,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method !== "POST") {
				sendMethodNotAllowed(res, "POST");
				return;
			}
			const body = await readJsonBody(req, res);
			if (body === void 0) return;
			const target = stringField(body, "target");
			const workspace = stringField(body, "path");
			if (target === void 0 || target.length === 0 || workspace === void 0 || workspace.length === 0) {
				sendJson(res, 400, {
					code: "bad-request",
					message: "request body must be JSON with string \"target\" and \"path\""
				});
				return;
			}
			const item = (await loadSettings()).items.find((entry) => entry.id === target);
			if (item === void 0) {
				sendJson(res, 400, {
					code: "bad-request",
					message: `unknown item: ${target}`
				});
				return;
			}
			if (!isAbsolute(workspace)) {
				sendJson(res, 400, {
					code: "bad-request",
					message: "path must be an absolute directory path"
				});
				return;
			}
			let isDirectory;
			try {
				isDirectory = (await stat(workspace)).isDirectory();
			} catch {
				isDirectory = false;
			}
			if (!isDirectory) {
				sendJson(res, 404, {
					code: "not-found",
					message: `directory does not exist: ${workspace}`
				});
				return;
			}
			try {
				launchItem(ctx, item.id, await resolvePath(item.path), workspace, item.passCwd !== false, logger);
				sendJson(res, 200, { ok: true });
			} catch (err) {
				logger.error("launch failed", {
					target,
					err
				});
				sendJson(res, 502, {
					code: "launch-failed",
					message: `failed to launch ${target}`
				});
			}
		}
	}), `open-with: ${OPEN_WITH_OPEN_PATH}`);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: OPEN_WITH_LOG_PATH,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method !== "POST") {
				sendMethodNotAllowed(res, "POST");
				return;
			}
			const body = await readJsonBody(req, res);
			if (body === void 0) return;
			const level = stringField(body, "level");
			const message = stringField(body, "message");
			const extra = body !== null && typeof body === "object" ? body.extra : void 0;
			const normalized = level === "warn" || level === "error" ? level : "info";
			logger.client(normalized, message ?? "", extra);
			sendJson(res, 200, { ok: true });
		}
	}), `open-with: ${OPEN_WITH_LOG_PATH}`);
}
//#endregion
export { apply, inject, name };
