# dsh-plugin-open-with

> 🌐 [English](README.en-US.md) · **简体中文**（本文件） · [🌐 双语版 / Bilingual](README.md)
>
> 源码仓库：<https://github.com/hyrinx/dsh-plugin-open-with> ·
> npm 包：[`dsh-plugin-open-with`](https://www.npmjs.com/package/dsh-plugin-open-with) ·
> 许可证：[MIT](LICENSE)

[![npm 版本](https://img.shields.io/npm/v/dsh-plugin-open-with?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-plugin-open-with)
[![npm 月下载量](https://img.shields.io/npm/dm/dsh-plugin-open-with?logo=npm&label=%E4%B8%8B%E8%BD%BD%E9%87%8F&color=cb3837)](https://www.npmjs.com/package/dsh-plugin-open-with)
[![npm: 平台 win32](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows11&logoColor=white)](#%E6%94%AF%E6%8C%81%E5%B9%B3%E5%8F%B0)
[![DSH 宿主版本](https://img.shields.io/badge/dsh-%E2%89%A50.1.1--rc.1-7C3AED?labelColor=0F172A)](#%E5%AE%89%E8%A3%85)
[![许可证: MIT](https://img.shields.io/github/license/hyrinx/dsh-plugin-open-with)](LICENSE)
[![Conventional Commits](https://img.shields.io/badge/commits-Conventional-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
[![在 DSH 中打开](https://img.shields.io/badge/DSH-%E5%8A%A0%E5%85%A5%20Web%20Profile-111827?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmU9IjkgMTggMTUgMTIgOSA2Ij48L3N2Zz4=)](#%E5%AE%89%E8%A3%85)

一个 DSH bundle 插件，在 dsh web 会话头部动作栏添加一个**胶囊拆分按钮**。左侧按下会使用上次选定的启动器（默认 **VS Code**）打开当前会话对应的工作区目录；右侧的小箭头展开一个毛玻璃样式的下拉菜单，提供「**打开 VS Code / 打开终端 / 打开文件夹**」三种目标——后续可以扩展到更多启动器（如 IDEA、其他编辑器、Git GUI、浏览器等）。

![概念图](https://via.placeholder.com/600x80?text=open-with+splitter+in+conversation+header)

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

| 操作系统 | 状态 | 备注 |
|---|---|---|
| **Windows 10 / 11 x64** | ✅ 主支持 | 原生支持 `code`、`cmd`、`explorer.exe` |
| macOS（任意架构） | ⚠️ 社区支持 | `code` + `$SHELL` + `/usr/bin/open`；未做终端标题栏特化 |
| Linux（任意发行版） | ⚠️ 社区支持 | `code` + `$SHELL` + `xdg-open` |

最低宿主引擎版本：**DSH `>= 0.1.1-rc.1`**（声明于 `package.json → dsh.engines.dsh`）。最低 Node 运行时：`^22.19 || >=24`（`package.json → engines.node`）。

## 安装

### 通过 npm 安装（最终用户，推荐）

```sh
# 1. 安装到 DSH web profile
dsh plugin --profile web add dsh-plugin-open-with

# 2. 重启 web 宿主，让 bundle 重新解析 slot 注册
dsh web restart
#  或直接杀掉正在运行的 "dsh web" 进程再启动
```

下次刷新页面，会话头部动作栏就会出现胶囊按钮。卸载：`dsh plugin --profile web remove dsh-plugin-open-with`。

### 从源码安装（贡献者 / 本地构建）

前置条件：Node ^22.19 或 >= 24。构建依赖使用 `tsdown 0.6` + `rolldown 1.0.0-beta.7`，版本通过锁文件锁定。

```sh
git clone https://github.com/hyrinx/dsh-plugin-open-with.git
cd dsh-plugin-open-with
npm install
npm run build      # 产出 lib/index.js + lib/client.js
```

把本地构建的插件加入 web profile：

```sh
dsh plugin --profile web add "$(pwd)"
# 或 Windows PowerShell：
# dsh plugin --profile web add D:\git\dsh-plugin-open-with
```

重启 `dsh web` 后生效。发布到 npm 的完整步骤单独放在 [`PUBLISH.md`](PUBLISH.md) 操作手册里。

## 文件结构

```
open-with/
├── README.md                  # 🌐 双语着陆页（GitHub + npm 默认渲染）
├── README.en-US.md            # 英文版 / English-only version
├── README.zh.md               # 中文版（本文件）/ Simplified Chinese version
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

- Bug 与功能需求请提 issue：<https://github.com/hyrinx/dsh-plugin-open-with/issues>
- 新增启动器请参考上方「[扩展新的启动器](#扩展新的启动器)」五步法
- 提交信息遵循 [Conventional Commits 1.0](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 格式
  （`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:`）

## 发布 / 上传到 npm

详见 [`PUBLISH.md`](PUBLISH.md) 发布手册（发布前检查清单、`npm pack` 预览验证、beta 标签、撤回 / 废弃版本、常见错误速查）。

## 许可证

[MIT](LICENSE) © 2026 [hyrinx](https://github.com/hyrinx)
