<div align="center">
  <h1>dsh-plugin-open-with</h1>
  <p>
    <strong>打开方式 · 胶囊拆分按钮</strong><br />
    在 DeepSeek Harness Web 会话头部添加胶囊拆分按钮，一键在当前工作区打开 VS Code、终端（CMD / PowerShell）和文件资源管理器。
  </p>
  <p>
    <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><img src="https://img.shields.io/npm/v/dsh-plugin-open-with?logo=npm&label=" alt="npm" /></a>
    <a href="https://github.com/hyrinx/dsh-plugin-open-with/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/dsh-plugin-open-with" alt="License" /></a>
    <img src="https://img.shields.io/badge/platform-Windows-0078D6?logo=windows" alt="platform: Windows" />
    <a href="https://www.npmjs.com/package/dsh-plugin-open-with"><img src="https://img.shields.io/npm/dt/dsh-plugin-open-with?logo=npm&color=cb6b5b" alt="downloads" /></a>
  </p>
  <p>
    <a href="#-效果图">🖼 效果图</a> ·
    <a href="#-功能">🧩 功能</a> ·
    <a href="#-支持系统">💻 支持系统</a> ·
    <a href="#-安装">🚀 安装</a> ·
    <a href="#-安全模型">🔒 安全模型</a> ·
    <a href="#-已知限制">🚧 已知限制</a> ·
    <a href="#-构建与扩展">🏗 构建与扩展</a> ·
    <a href="#-贡献">🤝 贡献</a> ·
    <a href="#-license">📜 License</a>
  </p>
</div>

## 🖼 效果图

![胶囊拆分按钮效果图](https://github.com/hyrinx/dsh-plugin-open-with/raw/main/assets/screenshot-1.png)

![设置页面效果图](https://github.com/hyrinx/dsh-plugin-open-with/raw/main/assets/screenshot-2.png)

## 🧩 功能

- 💊 **胶囊拆分按钮**：左半边执行当前选择的启动器；右半边下拉菜单列出全部启动器，点击即切换并立即启动。
- 🛠 **四个内置启动器**：
  - **VS Code**：解析 PATH 上的 VS Code CLI，通过 `cmd /c` 启动。
  - **CMD / PowerShell**：开独立控制台窗口并定位到工作区。
  - **文件资源管理器**：调用 `explorer.exe` 打开工作区。
- ⚙️ **设置页面**：在 DSH 设置面板中注入「Open With」配置区域，支持：
  - **按钮位置可切换**：胶囊按钮可注入会话标题旁（`actions`）或右侧工具区（`utilities`），保存后立即迁移槽位。
  - **按钮顺序可调**：同一槽位内按 order 值升序排列，数值越小越靠前（官方「在应用中打开」为 -10），保存后立即重排。
  - **可开关内置插件**：设置页用一个开关整体启用/禁用 DSH 内置的 `open-in-app`（Host 半 + Client 半）；一对包必须同时运行，所以合并为一个开关，关闭后打开按钮完全交由本插件接管。
  - **当前项选择**：点击卡片切换当前启动器，胶囊按钮同步更新。
  - **拖拽排序**：预设项和自定义项各自组内拖拽重排，插入线指示落点。胶囊菜单排序与设置页所见即所得。
  - **可见性控制**：每项支持独立隐藏/显示，胶囊菜单仅展示可见项。
  - **自定义项管理**：添加/编辑自定义启动器，填写名称和路径；路径自动清除首尾引号兼容粘贴。
  - **持久化存储**：设置自动保存到 `profile/<mode>/open-with/settings.json`，重启后保持。
- 🌍 **中英双语 UI**：跟随 DSH 客户端全局 locale 自动切换。

---

## 💻 支持系统

| 系统                        | 状态        |
| --------------------------- | ----------- |
| 🪟**Windows 10 / 11** | ✅ 完全支持 |
| 🍎 macOS                    | ❌ 暂不支持 |
| 🐧 Linux                    | ❌ 暂不支持 |

> ⚠️ **当前版本仅支持 Windows 平台**。我们非常欢迎社区贡献 macOS 和 Linux 的适配！

---

## 🚀 安装

### 方式一：从 npm 安装（推荐）

已发布到 npm：**[dsh-plugin-open-with](https://www.npmjs.com/package/dsh-plugin-open-with)**（当前最新 1.0.0）。在终端执行：

```sh
# 安装
dsh --profile web plugin add dsh-plugin-open-with

# 验证安装版本
dsh --profile web plugin list

# 卸载
dsh --profile web plugin remove dsh-plugin-open-with
```

### 方式二：从仓库安装（开发 / 调试）

```sh
git clone https://github.com/hyrinx/dsh-plugin-open-with.git
cd dsh-plugin-open-with
npm install
npm run build
dsh --profile web plugin add "link:$($PWD.Path)"
```

重启 `dsh web` 生效。后续修改源码只需重新 `npm run build` + 刷新浏览器。

---

## 🔒 安全模型

本插件会在 DSH 宿主端启动外部程序，安全措施如下：

1. **WebServer 路由 + 连接信任栅栏**：host 端在 `ctx.webServer` 注册 `/open-with/settings`、`/open-with/icon`、`/open-with/open`、`/open-with/log` 四条路由；每条都先经 `ctx.connection.requestRejection` 校验 Host/Origin，抵御 DNS rebinding 与跨站调用。请求体限 64 KiB 且必须是 JSON。
2. **封闭枚举 target**：启动目标为 TypeScript closed union，非法值无法进入可执行文件名。
3. **工作区路径来自会话 snapshot 且 host 端二次校验**：必须是可执行文件存在的绝对目录路径。

---

## 🚧 已知限制

- **仅支持 Windows**：macOS / Linux 适配需要社区贡献。
- **必须通过本机浏览器回环访问**（`localhost` / `127.0.0.1`）。
- **VS Code 需要先把 `code` 命令加入 PATH**：VS Code 命令面板 → `Shell Command: Install 'code' command in PATH`。
- **终端使用系统自带 cmd.exe / powershell.exe**：自定义启动器支持任意 .exe 路径。
- **图标从本地可执行文件按需提取**：由 host 端用 PowerShell 的 `ExtractAssociatedIcon` 取图标并缓存；取不到时回退到内置 DSH 图标。

---

## 🏗 构建与扩展

```sh
npm install
npm run build       # tsdown 出主/客两端 bundle，tsc 出 lib/types/*.d.ts
npm run typecheck   # tsc -p tsconfig.json --noEmit
npm pack            # 发布前预览 tarball 内容
npm publish --access public
```

**目录结构**（双半包：一个 host 半 + 一个 `dsh.client` 浏览器半）：

```
dsh-plugin-open-with/
├── src/
│   ├── index.ts          host 半入口：四条 webServer 路由 + connection 信任栅栏
│   ├── shared.ts         两半共享的协议、设置模型与归一化
│   ├── storage.ts        settings.json 原子读写
│   ├── logger.ts         host.log 落盘与轮转
│   ├── launch.ts         各目标的 spawn 配方
│   ├── icons.ts          从可执行文件提取图标
│   ├── dsh-home.ts       $DSH_HOME / profile 路径解析
│   └── client/           浏览器半：入口、UI、RPC 载体、词典
├── locale/               插件展示元数据（DSH 插件管理页的标题与描述来源）
├── lib/                  构建产物，勿手改（index.js / client.js / types/）
├── cordis.patch.yml      bundle 补丁，把本插件插入组合树
├── tsdown.config.ts      双配置：host 出 ESM，client 出 ModuleLoader 闭包工厂
└── tsconfig.json         只出声明（emitDeclarationOnly → lib/types/）
```

`lib/` 与 `package.json#exports` 的子路径一一对应：`.` → `lib/index.js`、
`./client` → `lib/client.js`、`./locale/*.json` → `locale/*.json`。
发布物由 `files` 精确列举，所以 `lib/client.js.map` 只留在本地供调试、不进 tarball。

展示名与描述只来自 `locale/*.json` 的 `meta`（`package.json` 的 `name`/`description`
仅作 fallback），`locale/en.json` 是 DSH 的发现基线，缺了整包元数据就不生效。

**如何新增一个启动器**：

通过设置页 UI 添加自定义项即可（推荐，无需改代码）：在 DSH 设置面板 → Open With → Custom 区域点击「+ Add」，填写应用名称和 .exe 路径。支持拖拽排序和可见性控制。

若要新增一个**内置**启动器，需要同步修改三处：`src/shared.ts`（`PRESET_ITEMS` 与 `LaunchTarget`）、`src/launch.ts`（启动配方）、`src/client/locales.ts`（显示文案）。

---

## 🤝 贡献

欢迎以下方向的 PR：

- 🍎🐧 **macOS / Linux 平台适配**：实现各平台的 shell、文件管理器启动和
- 🖥 **更多 IDE 启动器**：JetBrains 全家桶、Sublime Text、Neovide、Cursor、Windsurf……
- 💻 **更多终端候选**：Windows Terminal (`wt`)、PowerShell 7 (`pwsh`)、Git Bash、Alacritty、WezTerm……
- ⚙️ **设置页增强**：导入/导出配置、批量操作
- 🎨 **UI 反馈**：为启动过程加入进行中 / 成功 / 失败的可视状态

提 PR 前请确保：

```sh
npm run typecheck   # 通过
npm run build       # 通过
npm pack            # 无 WARN / error
```

---

## 📜 License

MIT © [hyrinx](https://github.com/hyrinx)。详见 [LICENSE](LICENSE)。
