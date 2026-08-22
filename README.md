<div align="center">

<p align="center">
  <strong>🌐 双语版 / Bilingual</strong> · 上方折叠区中文 / 下方折叠区 English
</p>

<p align="center">
  Repository: <a href="https://github.com/hyrinx/dsh-plugin-open-with">github.com/hyrinx/dsh-plugin-open-with</a> ·
  Package: <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><code>dsh-plugin-open-with</code> on npm</a> ·
  License: <a href="LICENSE">MIT</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-plugin-open-with?logo=npm&label=npm"></a>
  <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><img alt="npm monthly downloads" src="https://img.shields.io/npm/dm/dsh-plugin-open-with?logo=npm&label=downloads&color=cb3837"></a>
  <a href="#supported-platforms--支持平台"><img alt="platform: Windows" src="https://img.shields.io/badge/platform-Windows-0078D4?logo=windows11&logoColor=white"></a>
  <a href="#installation--安装"><img alt="DSH engine >= 0.1.1-rc.1" src="https://img.shields.io/badge/dsh-%E2%89%A50.1.1--rc.1-7C3AED?labelColor=0F172A"></a>
  <a href="LICENSE"><img alt="license: MIT" src="https://img.shields.io/github/license/hyrinx/dsh-plugin-open-with"></a>
  <a href="https://www.conventionalcommits.org/"><img alt="Conventional Commits" src="https://img.shields.io/badge/commits-Conventional-FE5196?logo=conventionalcommits&logoColor=white"></a>
  <a href="#installation--安装"><img alt="Open in DSH Web Profile" src="https://img.shields.io/badge/DSH-Add%20to%20Web%20Profile-111827?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmU9IjkgMTggMTUgMTIgOSA2Ij48L3N2Zz4="></a>
</p>

---

<p align="center">
<strong>🇨🇳 一句话简介</strong>　在 DeepSeek Harness Web 会话头部加一个<strong>胶囊拆分按钮</strong>，一键打开当前工作区的 VS Code、cmd/Windows Terminal 和文件资源管理器（仅 Windows）。
</p>

<p align="center">
<strong>🇺🇸 TL;DR</strong>　A DSH bundle plugin adding a <strong>capsule split-button</strong> to the dsh web conversation header: launch VS Code, cmd/Windows Terminal & File Explorer at the current workspace with one click (Windows only).
</p>

---

<p align="center">
<img alt="Concept screenshot placeholder" src="https://via.placeholder.com/680x88?text=open-with+capsule+splitter+in+conversation+header">
</p>

---

<!-- ============================================================ -->

<!-- 🇨🇳 简体中文全文 · Simplified Chinese · 默认展开 / open by default -->

<!-- ============================================================ -->

<details open>
<summary>
 
<strong>🇨🇳 简体中文全文（默认展开）</strong>
 
<sup><em>点我折叠 / Click to collapse</em></sup>
</summary>

---

## 功能

- **左侧按钮** — 在当前会话的工作区目录下启动用户最近一次选择的目标。按钮左侧的图标会根据当前目标自动切换（VS Code 线描图标 / 终端图标 / 文件夹图标）。
- **右侧选择箭头** — 毛玻璃风格的下拉菜单，**一次点击**既切换记忆中的默认目标，又立即执行启动（参照 Trae Work 的交互）。内置三种目标：
  - `code` — 通过 `code` CLI 命令打开 Visual Studio Code 桌面版
  - `cmd`  — 在工作区打开一个交互终端（跨平台自动选择：Windows 下为 `cmd.exe /K cd /d <cwd>`；macOS / Linux 下按 `$SHELL` 选择 `zsh -i` / `bash -i` / `sh -i`）
  - `explorer` — 在工作区打开系统文件管理器（Windows 下 `explorer.exe`，macOS 下 `/usr/bin/open`，Linux 下 `xdg-open`）
- **RPC 通道** — Host 侧注册 `/open-with` 端点，带 `loopback` 权限围栏；提供 `launch` 与 `log` 两个动作。Client 侧通过 `log` 端点把浏览器端的日志转发到宿主端，于是 `~/.dsh/logs/dsh-plugin-open-with/` 下的一个按日轮转日志文件就能同时抓到插件两侧的诊断。
- **跨平台 home 路径** — 日志目录的查找顺序与 `@deepseek-ai/dsh-home-paths` 一致（显式 override → `$DSH_HOME` 环境变量 → `~/.dsh`），守护进程、systemd 单元、Docker 容器等可通过统一的环境变量重定向日志。
- **安全语义** — `resolveExecutable` 对 `code` / `cmd` / `explorer` 的查找会拒绝路径分隔符；`spawn` 调用时继承 subprocess 服务清洗过的环境，而非原始宿主进程环境。

## 架构

```
浏览器侧 (React)                                 宿主侧 (Node)
┌──────────────────────────────┐               ┌──────────────────────────────┐
│ OpenWithButton               │  RPC /open-with│ buildSpawnSpec(target)       │
│  ├─ action 半区：启动上次    │ ─────────────→│ resolveExecutable('code')    │
│  └─ picker：切换 + 立即启动  │    launch/log │ spawn(code / cmd / explorer) │
│ slot: header.actions         │               │ logger → ~/.dsh/logs/...     │
└──────────────────────────────┘               └──────────────────────────────┘
```

## 支持平台

| 操作系统                      | 状态          | 备注                                                          |
| ----------------------------- | ------------- | ------------------------------------------------------------- |
| **Windows 10 / 11 x64** | ✅ 主支持     | 原生支持`code`、`cmd`、`explorer.exe`                   |
| macOS（任意架构）             | ⚠️ 社区支持 | `code` + `$SHELL` + `/usr/bin/open`；未做终端标题栏特化 |
| Linux（任意发行版）           | ⚠️ 社区支持 | `code` + `$SHELL` + `xdg-open`                          |

最低宿主引擎版本：**DSH `>= 0.1.1-rc.1`**（声明于 `package.json → dsh.engines.dsh`）。最低 Node 运行时：`^22.19 || >=24`（`package.json → engines.node`）。

## 安装

### 通过 npm 安装（最终用户，唯一推荐方式）

本插件已发布到 npm，**直接通过包名安装，无需克隆源码或本地路径链接**：

```sh
# 1. 安装到 DSH web profile
dsh plugin --profile web add dsh-plugin-open-with

# 2. 重启 web 宿主，让 bundle 重新解析 slot 注册
dsh web restart
#  或直接杀掉正在运行的 "dsh web" 进程再启动
```

下次刷新页面，会话头部动作栏就会出现胶囊按钮。

- 包页面：<https://www.npmjs.com/package/dsh-plugin-open-with>
- 卸载：`dsh plugin --profile web remove dsh-plugin-open-with`

### 从源码构建（仅贡献者 / 开发者）

> **最终用户请使用上方的 npm 安装方式，不需要阅读本节。**

前置条件：Node ^22.19 或 >= 24。构建依赖使用 `tsdown 0.6` + `rolldown 1.0.0-beta.7`，版本通过锁文件锁定。

```sh
git clone https://github.com/hyrinx/dsh-plugin-open-with.git
cd dsh-plugin-open-with
npm install
npm run build      # 产出 lib/index.js + lib/client.js
```

构建完成后可通过本地路径临时加载到 profile（仅限开发者自行验证）：

```sh
dsh plugin --profile web add "$(pwd)"
# 或 Windows PowerShell：
# dsh plugin --profile web add D:\git\dsh-plugin-open-with
```

重启 `dsh web` 后生效。

## 文件结构

```
open-with/
├── README.md                  # 🌐 双语着陆页（GitHub + npm 默认渲染，即本文件）
├── README.en-US.md            # 英文版 / English-only version
├── README.zh.md               # 中文版 / Simplified Chinese version
├── LICENSE                    # MIT 许可证正文（与 package.json 声明一致）
├── PUBLISH.md                 # 发布到 npm 的操作手册（仅维护者需要）
├── package.json               # 包名 "dsh-plugin-open-with"；声明 dsh.bundle + dsh.client manifest
├── cordis.patch.yml           # 组合条目：id = "open-with"
├── tsdown.config.ts           # 两次构建（宿主 ESM、浏览器 CJS + ModuleLoader 握手壳）
├── tsconfig.json
├── .gitignore                 # 包级忽略（lib/、src/assets.ts 等构建产物 / 生成文件）
├── .gitattributes             # 换行规则 + linguist 语言统计提示
├── assets/                    # 32×32 PNG 图标源文件（进 git，npm 包不发）
│   ├── vscode.png             #   从 Code.exe 提取
│   ├── cmd.png                #   从 cmd.exe 提取（兼作终端图标）
│   └── explorer.png           #   从 explorer.exe 提取
├── script/                    # 构建期脚本（不发布到 npm）
│   ├── extract-icons.ps1      #   PowerShell：从本机 .exe 重新提取 PNG
│   └── assets-to-base64.mjs   #   Node：把 PNG 写成 src/assets.ts 的 base64 导出
├── src/                       # 源代码（TypeScript，编译产物输出到同级 lib/）
│   ├── index.ts               # Host：RPC handler + 多目标启动分派
│   ├── logger.ts              # 按日轮转日志 + 终端镜像
│   ├── invariant.ts           # 安全说明（loopback 权限围栏）
│   ├── assets.ts              # 🤖 由 script/assets-to-base64.mjs 自动生成
│   │                          #   （.gitignore 忽略，通过 npm run assets 重建）
│   └── client/
│       ├── index.ts           # Browser：slot 注册 + locale 命名空间
│       ├── OpenVscodeButton.tsx  # React 胶囊拆分按钮
│       └── locales.ts         # 中英双语词典
└── lib/                       # 🔨 tsdown 构建产物（由 npm `files` 白名单分发；
                                 #   .gitignore 忽略，不进 git 仓库）。内容：
                                 #   ├── index.js    (宿主 ESM 包 ← src/index.ts)
                                 #   ├── index.d.ts  (TypeScript 类型声明)
                                 #   ├── client.js   (浏览器 CJS 包 ← src/client/index.ts
                                 #   │                 带 ModuleLoader 握手壳)
                                 #   └── client.d.ts
```

## 扩展新的启动器

新增一个启动器只需五小步：

1. 在 `src/index.ts` 的 `LaunchTarget` 联合类型里追加第四种（例如 `'idea'`、`'typora'` …）。
2. 在 `buildSpawnSpec()` 里追加对应分支，组装 argv。
3. 在 `src/client/locales.ts` 的 `en` 和 `zh` 两个词典里新增 `target.<名称>` 文案。
4. 在 `src/client/OpenVscodeButton.tsx` 的 `TARGETS` 有序数组末尾追加目标名，并在 `TARGET_META` 中补一个 14px 单色 SVG 图标。
5. 运行 `npm run build`，然后 `dsh plugin --profile web remove … add …` 刷新 profile 依赖。

## 贡献指南

- Bug 与功能需求请提 issue：[https://github.com/hyrinx/dsh-plugin-open-with/issues](https://github.com/hyrinx/dsh-plugin-open-with/issues)
- 新增启动器请参考上方「扩展新的启动器」五步法
- 提交信息遵循 [Conventional Commits 1.0](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 格式
  （`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:`）

---

</details>

<!-- ============================================================ -->

<!-- 🇺🇸 English version · 默认折叠 / closed by default -->

<!-- ============================================================ -->

<details>
<summary>
 
<strong>🇺🇸 English full text</strong>
 
<sup><em>点我展开 / Click to expand</em></sup>
</summary>

---

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

| OS                            | Status         | Notes                                                                            |
| ----------------------------- | -------------- | -------------------------------------------------------------------------------- |
| **Windows 10 / 11 x64** | ✅ Primary     | `code`, `cmd`, `explorer.exe` natively supported                           |
| macOS (any arch)              | ⚠️ Community | `code` + `$SHELL` + `/usr/bin/open`; no dedicated terminal title bar setup |
| Linux (any distro)            | ⚠️ Community | `code` + `$SHELL` + `xdg-open`                                             |

Minimum host engine: **DSH `>= 0.1.1-rc.1`** (declared in
`package.json → dsh.engines.dsh`). Minimum Node runtime: `^22.19 || >=24`
(matches `package.json → engines.node`).

## Installation

### From npm (end-users, only recommended way)

This plugin is published to npm. **Install by package name directly — no clone, no local path linking needed**:

```sh
# 1. Install globally into the DSH web profile.
dsh plugin --profile web add dsh-plugin-open-with

# 2. Restart the web shell so the bundle re-resolves slot registrations.
dsh web restart
#  or kill the running "dsh web" process and launch again.
```

The capsule button appears in the session header action bar on the next page refresh.

- Package page: <https://www.npmjs.com/package/dsh-plugin-open-with>
- To uninstall: `dsh plugin --profile web remove dsh-plugin-open-with`

### From source (contributors / developers only)

> **End-users: use the npm install method above — skip this section.**

Prerequisites: Node ^22.19 or >=24. Build deps need `tsdown 0.6` +
`rolldown 1.0.0-beta.7` — pinned automatically by the package lock.

```sh
git clone https://github.com/hyrinx/dsh-plugin-open-with.git
cd dsh-plugin-open-with
npm install
npm run build      # produces lib/index.js + lib/client.js
```

After building, you can temporarily load the local folder into a profile (for developer testing only):

```sh
dsh plugin --profile web add "$(pwd)"
# or, on Windows PowerShell:
# dsh plugin --profile web add D:\git\dsh-plugin-open-with
```

Restart `dsh web`; the capsule button appears in the session header action bar.

## File layout

```
open-with/
├── README.md                  # 🌐 Bilingual landing page (default for GitHub + npm — this file)
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
  [https://github.com/hyrinx/dsh-plugin-open-with/issues](https://github.com/hyrinx/dsh-plugin-open-with/issues).
- Follow the five-step guide under [*Extending to more launchers*](#extending-to-more-launchers-english)
  for adding targets.
- Commit messages use the
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  format (`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:`).

---

</details>

---

## License · 许可证

**[MIT](LICENSE)** © 2026 [hyrinx](https://github.com/hyrinx) &lt;xhy_23@qq.com&gt;

> Code: MIT. Documentation (README variants): CC-BY-4.0 — feel free to
> translate or redistribute with attribution.
