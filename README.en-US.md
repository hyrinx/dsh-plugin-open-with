# dsh-plugin-open-with

> 🌐 **English** (this file) · [简体中文](README.zh.md) · [🌐 双语版 / Bilingual](README.md)
>
> Repository: <https://github.com/hyrinx/dsh-plugin-open-with> ·
> Package: [`dsh-plugin-open-with` on npm](https://www.npmjs.com/package/dsh-plugin-open-with) ·
> License: [MIT](LICENSE)

[![npm version](https://img.shields.io/npm/v/dsh-plugin-open-with?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-plugin-open-with)
[![npm: platform win32](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows11&logoColor=white)](#supported-platforms)
[![DSH engine](https://img.shields.io/badge/dsh-%E2%89%A50.1.1--rc.1-7C3AED?labelColor=0F172A)](#installation)
[![license: MIT](https://img.shields.io/github/license/hyrinx/dsh-plugin-open-with)](LICENSE)
[![Conventional Commits](https://img.shields.io/badge/commits-Conventional-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org/)
[![Open in DSH](https://img.shields.io/badge/DSH-Open%20in%20Web%20Profile-111827?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmU9IjkgMTggMTUgMTIgOSA2Ij48L3N2Zz4=)](#installation)

A DSH bundle plugin that adds a **capsule split-button** to the dsh web
conversation header. The left half fires the previously-chosen launcher
(default: **VS Code**); the right half opens a glass-style picker for
**Open VS Code / Open Terminal / Open Folder** — extensible to more
launchers later (IDEs, editors, Git GUI, browsers, …).

![Concept](https://via.placeholder.com/600x80?text=open-with+splitter+in+conversation+header)

## What it does

- **Left button** — launches the last remembered target at the workspace
  directory of the current session. Icon follows the target (VS Code
  stroke icon / terminal glyph / folder glyph).
- **Right chevron** — a glass-style dropdown that both switches the
  remembered target *and* immediately launches it as a single gesture
  (Trae Work UX). The three built-in targets are:
  - `code` — Visual Studio Code desktop via the `code` CLI shim
  - `cmd`  — an interactive shell at the workspace (platform-aware:
    `cmd.exe /K cd /d <cwd>` on Windows; `zsh -i` / `bash -i` / `sh -i`
    on macOS / Linux following `$SHELL`)
  - `explorer` — OS file manager at the workspace (`explorer.exe` on
    Windows, `/usr/bin/open` on macOS, `xdg-open` on Linux)
- **RPC tunnel** — the host side registers a loopback-only authority
  endpoint `/open-with` with two verbs `launch` and `log`; the client
  side forwards its own log lines through `log` so a single rotated log
  under `~/.dsh/logs/dsh-plugin-open-with/` captures both halves of the
  plugin.
- **Cross-platform home paths** — log dirs resolve through the same
  precedence as `@deepseek-ai/dsh-home-paths` (override → `$DSH_HOME` →
  `~/.dsh`), so daemons, systemd units and containers can redirect
  logs via the standard env var.
- **Security** — `resolveExecutable` rejects path separators in the
  `code`/`cmd`/`explorer` lookup; spawn invocations inherit the
  subprocess service's scrubbed environment, never the raw host env.

## Architecture

```
Browser (React)                                 Host (Node)
┌──────────────────────────────┐               ┌──────────────────────────────┐
│ OpenWithButton               │  RPC /open-with│ buildSpawnSpec(target)       │
│  ├─ action half: launch last │ ─────────────→│ resolveExecutable('code')    │
│  └─ picker: switch + launch  │    launch/log │ spawn(cmd / explorer / code) │
│ slots: header.actions slot   │               │ logger → ~/.dsh/logs/...     │
└──────────────────────────────┘               └──────────────────────────────┘
```

## Supported platforms

| OS | Status | Notes |
|---|---|---|
| **Windows 10 / 11 x64** | ✅ Primary | `code`, `cmd`, `explorer.exe` natively supported |
| macOS (any arch) | ⚠️ Community | `code` + `$SHELL` + `/usr/bin/open`; no dedicated terminal title bar setup |
| Linux (any distro) | ⚠️ Community | `code` + `$SHELL` + `xdg-open` |

Minimum host engine: **DSH `>= 0.1.1-rc.1`** (declared in
`package.json → dsh.engines.dsh`). Minimum Node runtime: `^22.19 || >=24`
(matches `package.json → engines.node`).

## Installation

### From npm (end-users, recommended)

```sh
# 1. Install globally into the DSH web profile.
dsh plugin --profile web add dsh-plugin-open-with

# 2. Restart the web shell so the bundle re-resolves slot registrations.
dsh web restart
#  or kill the running "dsh web" process and launch again.
```

The capsule button appears in the session header action bar on the
next page refresh. To uninstall: `dsh plugin --profile web remove dsh-plugin-open-with`.

### From source (contributor / development build)

Prerequisites: Node ^22.19 or >=24. Build deps need `tsdown 0.6` +
`rolldown 1.0.0-beta.7` — pinned automatically by the package lock.

```sh
git clone https://github.com/hyrinx/dsh-plugin-open-with.git
cd dsh-plugin-open-with
npm install
npm run build      # produces lib/index.js + lib/client.js
```

Register the local folder with the web profile:

```sh
dsh plugin --profile web add "$(pwd)"
# or, on Windows PowerShell:
# dsh plugin --profile web add D:\git\dsh-plugin-open-with
```

Restart `dsh web`; the capsule button appears in the session header
action bar. Publish-to-npm instructions are kept in a separate
[`PUBLISH.md`](PUBLISH.md) runbook.

## File layout

```
open-with/
├── README.md                  # 🌐 Bilingual landing page (default for GitHub + npm)
├── README.en-US.md            # English-only version
├── README.zh.md               # 中文版 / Simplified Chinese version
├── LICENSE                    # MIT license text (matches package.json)
├── PUBLISH.md                 # npm publish runbook (maintainer only)
├── package.json               # "dsh-plugin-open-with"; dsh.bundle + dsh.client manifest
├── cordis.patch.yml           # composition entry: id = "open-with"
├── tsdown.config.ts           # two builds (host ESM + client CJS with
│                              #  the ModuleLoader handshake wrapper)
├── tsconfig.json
├── .gitignore                 # package-level ignore (lib/, src/assets.ts, …)
├── .gitattributes             # LF/CRLF rules, linguist language stats hints
├── assets/                    # Source-of-truth 32×32 PNG icons (committed)
│   ├── vscode.png             #   extracted from Code.exe
│   ├── cmd.png                #   extracted from cmd.exe (shared terminal icon)
│   └── explorer.png           #   extracted from explorer.exe
├── script/                    # Build-time tooling (NOT published to npm)
│   ├── extract-icons.ps1      #   PowerShell: re-extract PNGs from system .exe
│   └── assets-to-base64.mjs   #   Node: write src/assets.ts base64 exports
├── src/                       # Source code (TypeScript → compiled into lib/)
│   ├── index.ts               # Host: RPC handler + launcher dispatch
│   ├── logger.ts              # Rotated file log (per-day) + console mirror
│   ├── invariant.ts           # Security notes (loopback authority gate)
│   ├── assets.ts              # 🤖 AUTO-GENERATED by script/assets-to-base64.mjs
│   │                          #   (ignored by git — rebuild via npm run assets)
│   └── client/
│       ├── index.ts           # Browser: slot registration + locale NS
│       ├── OpenVscodeButton.tsx  # React capsule split-button
│       └── locales.ts         # i18n dictionaries (en + zh)
└── lib/                       # 🔨 tsdown build output — published via npm `files`
                                 #   whitelist; ignored by git (see .gitignore).
                                 #   Contents:
                                 #   ├── index.js   (host ESM bundle   ← src/index.ts)
                                 #   ├── index.d.ts (TypeScript declarations)
                                 #   ├── client.js  (browser CJS bundle ← src/client/index.ts
                                 #   │               wrapped with ModuleLoader handshake)
                                 #   └── client.d.ts
```

## Extending to more launchers

Add a new launcher in five small steps:

1. Add a fourth union member to `LaunchTarget` in
   `src/index.ts` (`'code' | 'cmd' | 'explorer' | 'idea' | …`).
2. Add the argv-building branch to `buildSpawnSpec()`.
3. Register a new i18n label key `target.<name>` under both `en` and
   `zh` dictionaries in `src/client/locales.ts`.
4. Append the new target to the `TARGETS` ordered array and to
   `TARGET_META` (supply a 14px monochrome SVG icon) in
   `src/client/OpenVscodeButton.tsx`.
5. Run `npm run build` and `dsh plugin --profile web remove … add …` to
   refresh the profile bundle.

## Contributing

- Report bugs and request features at
  <https://github.com/hyrinx/dsh-plugin-open-with/issues>.
- Follow the five-step guide under [*Extending to more launchers*](#extending-to-more-launchers)
  for adding targets.
- Commit messages use the
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  format (`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:`).

## Release / publish to npm

See [`PUBLISH.md`](PUBLISH.md) for the step-by-step publish runbook
(pre-publish checklist, `npm pack` verification, beta tags, unpublish /
deprecate recovery, error cheat sheet).

## License

[MIT](LICENSE) © 2026 [hyrinx](https://github.com/hyrinx)
