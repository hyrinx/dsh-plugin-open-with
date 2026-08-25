import * as fs from "node:fs";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

//#region src/dsh-home.ts
const DSH_HOME_DIR_NAME = ".dsh";
const DSH_HOME_ENV = "DSH_HOME";
function expandHomePath(p) {
	if (p === "~") return homedir();
	if (p.startsWith("~/") || p.startsWith("~" + sep)) return join(homedir(), p.slice(2));
	return p;
}
function resolveDshHome(configured, env = process.env) {
	const fromEnv = env[DSH_HOME_ENV];
	const selected = configured ?? (fromEnv !== void 0 && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), DSH_HOME_DIR_NAME));
	return resolve(expandHomePath(selected));
}
function dshHomePath(...segments) {
	return join(resolveDshHome(), ...segments);
}

//#endregion
//#region src/logger.ts
const PLUGIN_NAME = "dsh-plugin-open-with";
function detectPluginProjectRoot() {
	let current;
	try {
		current = dirname(fileURLToPath(import.meta.url));
	} catch {
		current = typeof __dirname === "string" ? __dirname : process.cwd();
	}
	const rootsSeen = new Set();
	for (let depth = 0; depth < 8; depth++) {
		if (rootsSeen.has(current)) return null;
		rootsSeen.add(current);
		try {
			const pkgPath = join(current, "package.json");
			if (existsSync(pkgPath) && statSync(pkgPath).isFile()) try {
				const raw = readFileSync(pkgPath, "utf8");
				const pkg = JSON.parse(raw);
				if (pkg.name === PLUGIN_NAME) {
					const hasSrc = existsSync(join(current, "src")) && statSync(join(current, "src")).isDirectory();
					if (hasSrc) return resolve(current);
				}
			} catch {}
		} catch {}
		const parent = dirname(current);
		if (parent === current) return null;
		current = parent;
	}
	return null;
}
const DETECTED_PROJECT_ROOT = detectPluginProjectRoot();
const LOG_SOURCE = DETECTED_PROJECT_ROOT != null ? "local-dev" : "npm-install";
const LOG_DIR = LOG_SOURCE === "local-dev" ? DETECTED_PROJECT_ROOT : join(resolveDshHome(), "logs", PLUGIN_NAME);
const LOG_PATH = join(LOG_DIR, "host.log");
let initialized = false;
function ensureDir() {
	if (initialized) return;
	try {
		if (LOG_SOURCE !== "local-dev") mkdirSync(LOG_DIR, { recursive: true });
		writeFileSync(LOG_PATH, "", "utf8");
		initialized = true;
	} catch {}
}
function write(level, scope, message, extra) {
	ensureDir();
	const line = `[${level}] [${scope}] ${message}${extra != null ? " " + safeStringify(extra) : ""}\n`;
	try {
		appendFileSync(LOG_PATH, line, "utf8");
	} catch {}
	const consoleLine = `[open-with] [${scope}] ${message}${extra != null ? " " + safeStringify(extra) : ""}`;
	if (level === "error") console.error(consoleLine);
	else if (level === "warn") console.warn(consoleLine);
	else console.log(consoleLine);
}
function safeStringify(v) {
	if (v instanceof Error) return v.stack ?? `${v.name}: ${v.message}`;
	try {
		return typeof v === "string" ? v : JSON.stringify(v);
	} catch {
		return String(v);
	}
}
const logger = {
	info: (message, extra) => write("info", "host", message, extra),
	warn: (message, extra) => write("warn", "host", message, extra),
	error: (message, extra) => write("error", "host", message, extra),
	client: (level, message, extra) => write(level, "client", message, extra)
};

//#endregion
//#region src/index.ts
/** 设置文件存储路径：遵循 DSH 规范，$DSH_HOME/storages/dsh-open-with/settings.json */
const SETTINGS_DIR = dshHomePath("storages", "dsh-open-with");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");
/** 读取设置文件，失败时返回 null。 */
function readSettingsSync() {
	try {
		if (!fs.existsSync(SETTINGS_FILE)) return null;
		const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
const inject = ["subprocess", "connection"];
async function buildSpawnSpec(ctx, target, cwd) {
	switch (target) {
		case "code": {
			const exe = await ctx.subprocess.resolveExecutable("code");
			return {
				argv: [
					"cmd",
					"/c",
					exe,
					cwd
				],
				useSpawnCwd: false
			};
		}
		case "cmd": {
			const windir = process.env.windir ?? "C:\\Windows";
			const cmdPath = `${windir}\\System32\\cmd.exe`;
			const escapedCwd = cwd.includes(" ") ? `"${cwd}"` : cwd;
			const innerCommands = `title ${cmdPath} && cd /d ${escapedCwd}`;
			return {
				argv: [
					"cmd",
					"/c",
					"start",
					`"${cmdPath}"`,
					"cmd",
					"/K",
					innerCommands
				],
				useSpawnCwd: false
			};
		}
		case "powershell": {
			const windir = process.env.windir ?? "C:\\Windows";
			const psPath = `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
			const escapedCwd = cwd.replace(/'/g, "''");
			return {
				argv: [
					"cmd",
					"/c",
					"start",
					`"${psPath}"`,
					"powershell",
					"-NoExit",
					"-Command",
					`[Console]::Title = '${psPath.replace(/'/g, "''")}'; Set-Location -LiteralPath '${escapedCwd}'`
				],
				useSpawnCwd: false
			};
		}
		case "explorer": return {
			argv: ["explorer.exe", cwd],
			useSpawnCwd: false
		};
		default: {
			const _exhaustive = target;
			throw new Error(`unknown launch target: ${String(_exhaustive)}`);
		}
	}
}
/** 通过 PowerShell 从 exe 文件中提取图标，返回 base64 PNG data URL。 */
async function extractFileIcon(ctx, exePath) {
	logger.info("extractIcon start", { exePath });
	const escapedPath = exePath.replace(/'/g, "''");
	const psScript = [
		`$ErrorActionPreference = 'Stop'`,
		`[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`,
		`Add-Type -AssemblyName System.Drawing -ErrorAction Stop`,
		`$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${escapedPath}')`,
		`if (!$icon) { exit 0 }`,
		`$bitmap = $icon.ToBitmap()`,
		`$ms = New-Object System.IO.MemoryStream`,
		`$bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)`,
		`$bytes = $ms.ToArray()`,
		`$base64 = [Convert]::ToBase64String($bytes)`,
		`Write-Output "data:image/png;base64,$base64"`,
		`$ms.Close(); $bitmap.Dispose(); $icon.Dispose()`
	].join("; ");
	const maxBytes = 2 * 1024 * 1024;
	const handle = ctx.subprocess.spawn({
		argv: [
			"powershell",
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			psScript
		],
		stdio: {
			stdin: "ignore",
			stdout: { maxBytes },
			stderr: { maxBytes }
		},
		graceMs: 15e3
	});
	const outcome = await handle.done;
	const stderr = handle.collected.stderr?.readFrom(0).text ?? "";
	if (outcome.exitCode !== 0) {
		logger.error("extractIcon PowerShell failed", {
			exePath,
			exitCode: outcome.exitCode,
			stderr
		});
		return "";
	}
	if (stderr) logger.warn("extractIcon PowerShell stderr", {
		exePath,
		stderr
	});
	const stdout = handle.collected.stdout?.readFrom(0).text ?? "";
	const icon = stdout.trim();
	if (!icon) logger.warn("extractIcon returned empty", {
		exePath,
		stdoutLen: stdout.length,
		stderr
	});
	else logger.info("extractIcon done", {
		exePath,
		dataLen: icon.length
	});
	return icon;
}
/** 获取预设启动器的实际可执行文件路径。 */
function resolvePresetPath(ctx, target) {
	const windir = process.env.windir ?? "C:\\Windows";
	switch (target) {
		case "cmd": return `${windir}\\System32\\cmd.exe`;
		case "powershell": return `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
		case "explorer": return `${windir}\\explorer.exe`;
		case "code": return "code";
		default: return "";
	}
}
function apply(ctx) {
	logger.info("plugin loaded");
	ctx.effect(() => {
		return ctx.connection.rpc.handle("/open-with", async (endpoint, payload) => {
			logger.info("RPC /open-with", {
				endpoint,
				payload
			});
			if (endpoint === "log") {
				const { level = "info", message = "", extra } = payload ?? {};
				logger.client(level, String(message), extra);
				return {
					ok: true,
					value: null
				};
			}
			if (endpoint === "extractIcon") {
				const { exePath } = payload ?? {};
				if (typeof exePath !== "string" || exePath.length === 0) return {
					ok: false,
					error: {
						code: "invalid-path",
						message: "exePath is required"
					}
				};
				try {
					const icon = await extractFileIcon(ctx, exePath);
					return {
						ok: true,
						value: { icon }
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					logger.error("extractIcon failed", err);
					return {
						ok: false,
						error: {
							code: "extract-failed",
							message
						}
					};
				}
			}
			if (endpoint === "resolvePresetPath") {
				const { target: target$1 } = payload ?? {};
				if (!target$1 || ![
					"code",
					"cmd",
					"powershell",
					"explorer"
				].includes(target$1)) return {
					ok: false,
					error: {
						code: "invalid-target",
						message: "target is required"
					}
				};
				try {
					let resolvedPath;
					if (target$1 === "code") {
						resolvedPath = await ctx.subprocess.resolveExecutable("code");
						const ext = path.extname(resolvedPath).toLowerCase();
						if (ext === ".cmd" || ext === ".bat") {
							const binDir = path.dirname(resolvedPath);
							const vsCodeDir = path.dirname(binDir);
							const exePath = path.join(vsCodeDir, "Code.exe");
							if (fs.existsSync(exePath)) resolvedPath = exePath;
						}
					} else resolvedPath = resolvePresetPath(ctx, target$1);
					return {
						ok: true,
						value: { path: resolvedPath }
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					logger.error("resolvePresetPath failed", err);
					return {
						ok: false,
						error: {
							code: "resolve-failed",
							message
						}
					};
				}
			}
			if (endpoint === "readSettings") try {
				if (!fs.existsSync(SETTINGS_FILE)) return {
					ok: true,
					value: { settings: null }
				};
				const raw = await fs.promises.readFile(SETTINGS_FILE, "utf-8");
				return {
					ok: true,
					value: { settings: JSON.parse(raw) }
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				logger.error("readSettings failed", err);
				return {
					ok: false,
					error: {
						code: "read-failed",
						message
					}
				};
			}
			if (endpoint === "writeSettings") {
				const { settings } = payload ?? {};
				if (settings === void 0) return {
					ok: false,
					error: {
						code: "invalid-settings",
						message: "settings is required"
					}
				};
				try {
					await fs.promises.mkdir(SETTINGS_DIR, { recursive: true });
					const tmp = SETTINGS_FILE + ".tmp";
					await fs.promises.writeFile(tmp, JSON.stringify(settings, null, 2), "utf-8");
					await fs.promises.rename(tmp, SETTINGS_FILE);
					logger.info("settings saved", { file: SETTINGS_FILE });
					return {
						ok: true,
						value: {}
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					logger.error("writeSettings failed", err);
					return {
						ok: false,
						error: {
							code: "write-failed",
							message
						}
					};
				}
			}
			if (endpoint !== "launch") {
				logger.warn("unknown endpoint", endpoint);
				return {
					ok: false,
					error: {
						code: "unknown-endpoint",
						message: `unknown endpoint: ${endpoint}`
					}
				};
			}
			const { cwd, target } = payload ?? {};
			if (typeof cwd !== "string" || cwd.length === 0) {
				logger.warn("cwd missing or invalid", { cwd });
				return {
					ok: false,
					error: {
						code: "invalid-cwd",
						message: "cwd is required"
					}
				};
			}
			const targetStr = target ?? "code";
			const isPreset = [
				"code",
				"cmd",
				"powershell",
				"explorer"
			].includes(targetStr);
			const resolvedTarget = isPreset ? targetStr : "code";
			try {
				if (!isPreset) {
					const settings = readSettingsSync();
					const item = settings?.items.find((it) => it.id === targetStr);
					if (!item || item.preset || !item.path) return {
						ok: false,
						error: {
							code: "invalid-target",
							message: `custom item not found: ${targetStr}`
						}
					};
					const escapedCwd = cwd.includes(" ") ? `"${cwd}"` : cwd;
					const handle$1 = ctx.subprocess.spawn({
						argv: [
							"cmd",
							"/c",
							"start",
							"",
							item.path
						],
						cwd,
						stdio: {
							stdin: "ignore",
							stdout: "inherit",
							stderr: "inherit"
						},
						graceMs: 5e3
					});
					logger.info("spawned custom item", {
						target: targetStr,
						path: item.path,
						pid: handle$1.pid
					});
					handle$1.done.catch((err) => {
						logger.error("process exited with error", err);
					});
					return {
						ok: true,
						value: {
							launched: true,
							target: targetStr,
							pid: handle$1.pid
						}
					};
				}
				if (resolvedTarget === "code") {
					const exe = await ctx.subprocess.resolveExecutable("code");
					logger.info("resolved code ->", exe);
				}
				const { argv, useSpawnCwd } = await buildSpawnSpec(ctx, resolvedTarget, cwd);
				const handle = ctx.subprocess.spawn({
					argv: [...argv],
					cwd: useSpawnCwd ? cwd : process.cwd(),
					stdio: {
						stdin: "ignore",
						stdout: "inherit",
						stderr: "inherit"
					},
					graceMs: 5e3
				});
				logger.info("spawned", {
					target: resolvedTarget,
					argv,
					pid: handle.pid
				});
				handle.done.catch((err) => {
					logger.error("process exited with error", err);
				});
				return {
					ok: true,
					value: {
						launched: true,
						target: resolvedTarget,
						pid: handle.pid
					}
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				logger.error("launch failed", err);
				if (resolvedTarget === "code") logger.error("install \"code\" CLI via VS Code Command Palette: \"Shell Command: Install 'code' command in PATH\"");
				return {
					ok: false,
					error: {
						code: "launch-failed",
						message: `failed to launch ${targetStr}: ${message}`
					}
				};
			}
		}, { authority: "loopback" });
	}, "open-with: RPC handler");
}

//#endregion
export { apply, inject };