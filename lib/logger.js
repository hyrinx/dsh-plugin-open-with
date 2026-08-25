// src/logger.ts
import { mkdirSync, appendFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
var DSH_HOME_ENV = "DSH_HOME";
var PLUGIN_NAME = "dsh-plugin-open-with";
function detectPluginProjectRoot() {
  let current;
  try {
    current = dirname(fileURLToPath(import.meta.url));
  } catch {
    current = typeof __dirname === "string" ? __dirname : process.cwd();
  }
  const rootsSeen = /* @__PURE__ */ new Set();
  for (let depth = 0; depth < 8; depth++) {
    if (rootsSeen.has(current)) return null;
    rootsSeen.add(current);
    try {
      const pkgPath = join(current, "package.json");
      if (existsSync(pkgPath) && statSync(pkgPath).isFile()) {
        try {
          const raw = readFileSync(pkgPath, "utf8");
          const pkg = JSON.parse(raw);
          if (pkg.name === PLUGIN_NAME) {
            const hasSrc = existsSync(join(current, "src")) && statSync(join(current, "src")).isDirectory();
            const hasScript = existsSync(join(current, "script")) && statSync(join(current, "script")).isDirectory();
            if (hasSrc || hasScript) return resolve(current);
          }
        } catch {
        }
      }
    } catch {
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  return null;
}
function expandHome(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~" + sep)) return join(homedir(), p.slice(2));
  return p;
}
function resolveDshHome(configured) {
  const fromEnv = process.env[DSH_HOME_ENV];
  const raw = configured ?? (fromEnv != null && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), ".dsh"));
  return resolve(expandHome(raw));
}
var DETECTED_PROJECT_ROOT = detectPluginProjectRoot();
var LOG_SOURCE = DETECTED_PROJECT_ROOT != null ? "local-dev" : "npm-install";
var LOG_DIR = LOG_SOURCE === "local-dev" ? join(DETECTED_PROJECT_ROOT, "logs") : join(resolveDshHome(), "logs", PLUGIN_NAME);
var LOG_PATH = join(LOG_DIR, `host-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.log`);
var initialized = false;
function ensureDir() {
  if (initialized) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    initialized = true;
  } catch {
  }
}
function write(level, scope, message, extra) {
  ensureDir();
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const line = `[${ts}] [${level}] [${scope}] [${LOG_SOURCE}] ${message}${extra != null ? " " + safeStringify(extra) : ""}
`;
  try {
    appendFileSync(LOG_PATH, line, "utf8");
  } catch {
  }
  const tag = LOG_SOURCE === "local-dev" ? `open-with+logs` : `open-with`;
  const consoleLine = `[${tag}] [${scope}] ${message}${extra != null ? " " + safeStringify(extra) : ""}`;
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
var logger = {
  info: (message, extra) => write("info", "host", message, extra),
  warn: (message, extra) => write("warn", "host", message, extra),
  error: (message, extra) => write("error", "host", message, extra),
  /** Client-side forwarded log lines arrive here via the /open-with/log RPC. */
  client: (level, message, extra) => write(level, "client", message, extra)
};
var LOG_FILE = LOG_PATH;
var LOG_DIRECTORY = LOG_DIR;
var LOG_LOCATION = LOG_SOURCE;
var PLUGIN_PROJECT_ROOT = DETECTED_PROJECT_ROOT;
export {
  LOG_DIRECTORY,
  LOG_FILE,
  LOG_LOCATION,
  PLUGIN_PROJECT_ROOT,
  logger
};
