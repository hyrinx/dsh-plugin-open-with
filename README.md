<div align="center">
  <p>
    <img src="https://github.com/hyrinx/dsh-plugin-open-with/raw/main/assets/icon.png" alt="dsh-plugin-open-with logo" width="128" height="128" />
  </p>
  <h1>dsh-plugin-open-with</h1>
  <p>
    <strong>打开方式 · 胶囊拆分按钮</strong><br />
    在 DeepSeek Harness Web 会话头部添加胶囊拆分按钮，一键在当前工作区打开 VS Code、终端和文件资源管理器。
  </p>
  <p>
    <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><img src="https://img.shields.io/npm/v/dsh-plugin-open-with?logo=npm&label=" alt="npm" /></a>
    <a href="https://github.com/hyrinx/dsh-plugin-open-with/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/dsh-plugin-open-with" alt="License" /></a>
    <img src="https://img.shields.io/badge/platform-win32-6fa8dc" alt="platform" />
    <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><img src="https://img.shields.io/npm/dt/dsh-plugin-open-with?logo=npm&color=cb6b5b" alt="downloads" /></a>
  </p>
  <p>
    <a href="#screenshot">效果图</a> ·
    <a href="#features">功能</a> ·
    <a href="#install">安装</a> ·
    <a href="#security-model">安全模型</a> ·
    <a href="#known-limitations">已知限制</a> ·
    <a href="#build-and-extend">构建与扩展</a> ·
    <a href="#contributing">贡献</a> ·
    <a href="#license">License</a>
  </p>
  <blockquote>
    Capsule split-button in the dsh web conversation header: open the workspace in VS Code, terminal, or file explorer — extensible to more launchers.
  </blockquote>
</div>

## 🖼 效果图 <a name="screenshot"></a> <span lang="en">Screenshot</span>

![胶囊拆分按钮效果图](https://github.com/hyrinx/dsh-plugin-open-with/raw/main/assets/screenshot-1.png)

## 🧩 功能 <a name="features"></a> <span lang="en">Features</span>

- 💊 **胶囊拆分按钮**：左半边执行当前选择的启动器（默认 VS Code，显示对应的图标与标签，如「打开 VS Code」）；右半边下拉菜单列出全部三个启动器，点击菜单项即切换并立即启动。固定 hover tooltip 为「在 VS Code、终端或文件管理器中打开工作区」，不随启动器切换。
- 🛠 **三个内置启动器**（均通过 DSH `subprocess` 服务在宿主端启动）：
  - **打开 VS Code**：调用 `ctx.subprocess.resolveExecutable('code')` 解析 PATH 上的 VS Code CLI，随后把工作区路径作为唯一参数传给它。Windows 下因 Node 无法直接 spawn `.CMD` 文件，结果会被 `cmd /c` 包裹一次；macOS / Linux 直接 spawn 返回的可执行文件。
  - **打开终端**：按平台选择 shell：Windows 用 `cmd.exe` 并通过 `start "cmdPath" cmd /K "title X && cd /d <cwd>"` 开一个独立的新控制台窗口（不会继承 dsh 宿主的 console）；macOS 按 `$SHELL` 选 `zsh`/`bash`；Linux 用 `$SHELL` 或回退 `bash`。
  - **打开文件夹**：Windows 调 `explorer.exe <cwd>`，macOS 调 `/usr/bin/open <cwd>`，Linux 调 `xdg-open <cwd>`。
- 🌍 **中英双语 UI**：按钮标签、下拉菜单、hover tooltip、ARIA 标签都内置 `zh` / `en` 两套字典，通过 `ctx.locale.register('openWith', { zh, en })` 注册，跟随 DSH 客户端全局 locale 自动切换。
- 🧱 **可扩展**：新增启动器要改三处——宿主 `src/index.ts` 的 `buildSpawnSpec()` switch 加一个 `case`，同时在浏览器端 `TARGETS` 常量、`TARGET_META` 映射，以及 `src/client/locales.ts` 字典里各加一条。目前没有开放的运行时 SPI，扩展需要 fork/改本插件源码。
- 📦 **薄宿主 + 薄浏览器端**：浏览器端只在 `conversation.session.header.actions` 插槽注入一个按钮组件；宿主端只注册 `/open-with` 一个 RPC 通道，含两个 endpoint——`launch(cwd, target)` 负责 spawn，`log(level, message, extra)` 负责把浏览器侧 console 行转发到宿主的日志文件。其余全部走 DSH 既有的 `subprocess`、`connection`、`locale`、`sessions`、`slots` 五个依赖服务。
- 🎨 **系统原生图标**：按钮与菜单项使用系统提取的原生 PNG 图标，视觉与任务栏 / 开始菜单保持一致。
- 🔒 **仅回环浏览器可用**：`/open-with` RPC 通道在 DSH 连接层以 `{ authority: 'loopback' }` 注册，非本机回环访问直接被网关拦截；浏览器端同时也只接受会话列表 snapshot 里真实存在的工作区路径，缺失则静默记录日志、不发起 spawn。

---

## 🚀 安装 <a name="install"></a> <span lang="en">Install</span>

### 方式一：从 npm 安装（推荐）<span lang="en">Install from npm (recommended)</span>

已发布到 npm：**[dsh-plugin-open-with](https://www.npmjs.com/package/dsh-plugin-open-with)**（当前远端最新 0.1.1）。在终端执行（`--profile` 必须放在 `plugin` 子命令之前，否则 dsh 会因为拿不到 profile 名而报错）：

```sh
# 安装
dsh --profile web plugin add dsh-plugin-open-with

# 验证安装版本
dsh --profile web plugin list

# 卸载
dsh --profile web plugin remove dsh-plugin-open-with
```

### 方式二：从仓库安装（开发 / 调试）<span lang="en">Install from repository (dev/debug)</span>

```sh
git clone https://github.com/hyrinx/dsh-plugin-open-with.git
cd dsh-plugin-open-with
npm install
npm run build

# PowerShell（Windows）：
dsh --profile web plugin add "link:$($PWD.Path)"

# macOS / Linux（bash/zsh）：
# dsh --profile web plugin add "link:$(pwd)"
```

重启 `dsh web` 生效。后续改源码只要重新 `npm run build` + 刷新浏览器（改 `cordis.patch.yml` 需重启 `dsh web`）。本地源码安装模式下日志写在 `<项目根>/logs/host-YYYY-MM-DD.log`，npm 安装模式下写在 `~/.dsh/logs/dsh-plugin-open-with/host-YYYY-MM-DD.log`。

---

## 🔒 安全模型 <a name="security-model"></a> <span lang="en">Security Model</span>

本插件会在 DSH 宿主端启动外部程序，因此依赖 DSH 核心层的三道围栏 + 自身一层枚举保护：

1. **Loopback 通道**：`/open-with` RPC handler 以 `authority: 'loopback'` 注册，DSH 网关只允许来自本机回环传输的请求，远程浏览器的调用在接入层即被拒绝，不会进入 launch 逻辑。
2. **封闭枚举 target**：`LaunchTarget` 是 `'code' | 'cmd' | 'explorer'` 三选一的 TypeScript closed union，`buildSpawnSpec()` 用 switch 逐分支写死 argv；`apply()` 里还有 `target === 'cmd' || target === 'explorer' ? target : 'code'` 的二次归一化——非法字符串永远不会进入可执行文件名。
3. **可执行名无路径分隔符**：`ctx.subprocess.resolveExecutable('code')` 在 master 实现里会拒绝含有路径分隔符或 `.`/`..` 的名字，保证只查 PATH，不会跳到任意路径。
4. **spawn 模式混合**：VS Code 与 Explorer 分支以非 shell 方式 spawn（VS Code 在 Windows 仍需 `cmd /c` 包裹 `.CMD` 路径，但整条 argv 是按数组传的，唯一可变字段 `cwd` 只进数组尾部；Explorer 直接传 argv 数组）。终端 Windows 分支因 `start` 的标题参数需要命令行脚本文本，确实拼了一次字符串，但只包含可执行路径标题 + `cd /d` 目标目录；目标目录在拼装前对空格做了双引号封装、对 PowerShell 分支做了单引号 `''` 转义。若需要更严格的限制，建议在扩展启动器时统一走非 shell spawn + argv 数组。
5. **工作区路径来自会话 snapshot**：浏览器端 `getCwd()` 通过 `ctx.sessions.list.getSnapshot().byId[sessionId].cwd` 读取，不接受任何 URL 参数 / localStorage 字符串路径；若会话不在列表中，launch 根本不会发起。

> 💡 远程访问 DSH Web（非本机）的用户希望"点一下打开我这台电脑的 VS Code"的需求**不属于本插件能力范围**：浏览器并不运行在想打开 VS Code 的那台主机上，RPC/Node spawn 永远是作用于 DSH 宿主端。这种需求需要把 DSH 部署在目标本机，或另行实现客户端侧 Native Messaging / 本地小助手的桥。

---

## 🚧 已知限制 <a name="known-limitations"></a> <span lang="en">Known Limitations</span>

- **npm 分发目前仅限 Windows**：`package.json` 的 `os` 字段声明为 `["win32"]`。尽管宿主源码里 `shellExecutable()` / `fileManagerLauncher()` 已写好 macOS / Linux 分支，但只在 Windows 上验证过，若你要支持其他平台需自行改 `os` 字段并测试。
- **必须通过本机浏览器回环访问**（`localhost` / `127.0.0.1`）：否则 DSH 网关按 `loopback` 权限规则直接拒掉 RPC。不要指望远程访问的浏览器能打开本地 IDE。
- **VS Code 需要先把 `code` 命令加入 PATH**：宿主端 `resolveExecutable('code')` 找不到时 launch 会失败；错误日志里附带两条修复指引（VS Code 命令面板 `Shell Command: Install 'code' command in PATH` 或把 `%USERPROFILE%\AppData\Local\Programs\Microsoft VS Code\bin` 加到 PATH）。目前没有 code → code-insiders → 注册表的多级 fallback 链。
- **终端默认选择与 README 描述一致**：Windows 下只开 `cmd.exe` 新窗口，没有 Windows Terminal (`wt`) / PowerShell 7 (`pwsh`) 的优先级回退；要换默认 shell 请改 `src/index.ts` 的 `shellExecutable()` 并重新 build。
- **长路径 / UNC 路径 / 空格路径**：对 cmd 的 `innerCommands` 做了双引号或单引号转义，Explorer 传 argv 数组不受空格影响；但极长路径（> 260 字符）与 UNC 网络路径在某些 Windows Terminal profile / 老版 cmd 下仍可能失败，此时看宿主日志中的退出码与 stderr。
- **依赖 `conversation.session.header.actions` 插槽**：由 `@deepseek-ai/dsh-client-ui-conversation` 提供。这个 slot 缺失时按钮不会被渲染，但插件不会让 DSH 崩溃（inject 是声明式的，cordis 缺依赖时直接跳过 apply）。
- **按钮不展示「正在打开 / 已打开 / 失败」的视觉反馈**：字典里定义了 `launching` / `opened` / `failed` 三个 i18n key，但当前版本没有把这些状态接入 React render，点击后的诊断只在宿主日志和浏览器控制台里可见。

---

## 🏗 构建与扩展 <a name="build-and-extend"></a> <span lang="en">Build & Extend</span>

```sh
npm install
npm run assets      # 自动提取系统可执行文件的图标并 base64 注入 src/assets.ts（由 script/assets-to-base64.mjs 驱动）
npm run build       # tsdown 产出 lib/ 主/客两端 bundle + lib/types/*.d.ts
npm run typecheck   # tsc -p tsconfig.json --noEmit
npm pack            # 发布前预览 tarball 内容（强烈建议每次 publish 前跑）
npm publish --access public
```

**如何新增一个启动器（需改本插件源码）**：

1. 宿主端 `src/index.ts`：`LaunchTarget` 枚举里加一个新 id，`buildSpawnSpec()` switch 里加对应 `case`，返回 `{ argv: string[], useSpawnCwd: boolean }`。
2. 浏览器端 `src/client/OpenVscodeButton.tsx`：`TARGETS` 数组加新 id，`TARGET_META` 里加图标组件与 labelKey。
3. 浏览器端 `src/client/locales.ts`：`OpenWithKey` interface 加新的 `target.<id>` key，并在 `en` / `zh` 字典里各写一行。
4. `npm run build` + `npm run typecheck` 通过后即可提 PR。

---

## 🤝 贡献 <a name="contributing"></a> <span lang="en">Contributing</span>

欢迎以下方向的 PR：

- macOS / Linux 实机验证 + `package.json` 放宽 `os` 字段
- 把默认启动器「code」改为可配置（需要引入 DSH 设置命名空间）
- 更多 IDE 启动器（JetBrains 全家桶、Sublime Text、Neovide……）
- 更多终端候选（Windows Terminal、pwsh、Git Bash、Alacritty、WezTerm……）
- 启动器位置可配置

提 PR 前请确保：

```sh
npm run typecheck   # 通过
npm run build       # 通过
npm pack            # 无 WARN / error
```

日志:（本地源码安装在 `<项目>/logs/`，npm 安装在 `~/.dsh/logs/dsh-plugin-open-with/`）。

---

## 📜 License <a name="license"></a> <span lang="en">License</span>

MIT © [hyrinx](https://github.com/hyrinx)。详见 [LICENSE](LICENSE)。
