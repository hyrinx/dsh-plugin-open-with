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
- 🪧 **默认启动器**：VS Code、CMD、PowerShell、文件资源管理器。它们只是**预置的自定义项**——毫无特权，同样可以被改、隐藏、删除。
- ⚡ **设置即改即生效**：设置页每次保存后，host 归一化后的文档通过进程内广播推给胶囊按钮，菜单即时重渲染。**无需等点开下拉**；展开菜单时仍会补读一次，仅作为兜底（如直接手改 settings.json）。
- ⚙️ **设置页面**：在 DSH 设置面板中注入「Open With」配置区域，支持：
  - **统一的项目管理**：所有启动器都是平等的普通项，支持统一的**添加 / 编辑 / 删除 / 拖拽排序 / 可见性控制**。预设项不过是最初写入的那批，编辑与删除同样开放，下拉菜单与设置页所见即所得。
  - **当前项选择**：点击卡片切换当前启动器，胶囊按钮同步更新。
  - **按钮位置可切换**：胶囊按钮可注入会话标题旁（`actions`）或右侧工具区（`utilities`），保存后立即迁移槽位。
  - **按钮顺序可调**：同一槽位内按 order 值升序排列，数值越小越靠前（官方「在应用中打开」为 -10），保存后立即重排。
  - **传递会话目录**：每项可选是否把会话工作区目录作为参数传给启动器（默认传递）。
  - **一键恢复默认**：把启动项列表还原为内置四项（两步确认；只动列表，不重置按钮位置与顺序）。
  - **接管内置按钮**：通过本插件自己的 bundle 补丁，声明式关闭 DSH 内置的 `open-in-app`（Host 与 Client 两半同进同退），会话头部不会出现两个打开按钮。补丁层随插件加载、也随插件消失 —— **卸载后内置按钮自动恢复**，本插件从不改动 profile 的 `cordis.patch.yml`。
  - **图标自动更新**：图标从本地可执行文件按需提取；编辑路径后，带修订号的 URL 主动破除浏览器缓存，图标随之更换。
  - **持久化存储**：设置自动保存到 `profile/<mode>/open-with/settings.json`，重启后保持。
- 🌍 **中英双语 UI**：跟随 DSH 客户端全局 locale 自动切换。

---

## 🚀 安装

### 方式一：从 npm 安装（推荐）

已发布到 npm：**[dsh-plugin-open-with](https://www.npmjs.com/package/dsh-plugin-open-with)**（当前最新 2.0.0）。在终端执行：

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

1. **WebServer 路由 + 连接信任栅栏**：host 端在 `ctx.webServer` 注册 settings / icon / open / log 四条路由；每条都先经 `ctx.connection.requestRejection` 校验 Host / Origin，抵御 DNS rebinding 与跨站调用。请求体限 64 KiB 且必须是 JSON。
2. **开放 item 模型，逐项校验**：启动目标为设置文档中的普通项 id，Wire 端校验 id 必须真实存在；路径必须是可执行文件存在的绝对目录路径，杜绝任意可执行文件注入。
3. **版本化图标寻址**：图标路由按 id + 修订号寻址，浏览器无法命中过期字节；取不到图标时返回 404 且前端留空位，不展示误导性兜底图。
4. **双半一致、可回退的接管**：内置 `open-in-app` 的 Host / Client 是一对，由本插件的 bundle 补丁按 id 一并关闭，避免只留一半的残缺形态；该补丁不属于 profile 配置，卸载即自动恢复。

---

## 🚧 已知限制

- **仅支持 Windows**：macOS / Linux 适配需要社区贡献。
- **必须通过本机浏览器回环访问**（`localhost` / `127.0.0.1`）。
- **VS Code 需要先把 `code` 命令加入 PATH**：首次运行时 host 用 PATH 解析预设项为绝对路径并写入配置；若命令不在 PATH，该项会保留裸名，需在设置页改填完整 `.exe` 路径。
- **终端使用系统自带 cmd.exe / powershell.exe**：自定义启动器支持任意 `.exe` 绝对路径。
- **图标从本地可执行文件按需提取**：由 host 端用 PowerShell 的 `ExtractAssociatedIcon` 取图标并缓存；取不到时图标位置留空，不显示占位图。

---

## 🏗 构建与扩展

```sh
npm install
npm run build       # 先清 lib，再 tsdown 出主/客两端 bundle，tsc 出 lib/types/*.d.ts
npm run clean       # 只删 lib（改过 src 文件结构后 build 会自己调它）
npm run typecheck   # tsc -p tsconfig.json --noEmit
npm pack            # 发布前预览 tarball 内容
npm publish --access public
```

**目录结构**（双半包：一个 host 半 + 一个 `dsh.client` 浏览器半）：

```
dsh-plugin-open-with/
├── src/
│   ├── index.ts          host 半入口：四条 webServer 路由 + connection 信任栅栏
│   ├── shared.ts         两半共享的路由、协议、设置模型与归一化
│   ├── storage.ts        settings.json 原子读写 + profile 路径解析
│   ├── logger.ts         host.log 落盘
│   ├── launch.ts         各启动器的 spawn 配方与可执行文件解析
│   ├── icons.ts          从可执行文件提取图标
│   └── client/           浏览器半
│       ├── index.ts      入口：挂载按钮、注入设置页、注册词典
│       ├── OpenWithButton.tsx    胶囊拆分按钮
│       ├── OpenWithSettings.tsx  设置面板（添加/编辑表单、拖拽排序、可见性）
│       ├── ItemIcon.tsx          两个界面共用的行内图标
│       ├── settings-events.ts    设置变更进程内广播（按钮即时刷新 + 图标破缓存）
│       ├── controller.ts         浏览器 → host 的 RPC 载体
│       └── locales.ts            中英双语词典
├── locale/               插件展示元数据（DSH 插件管理页的标题与描述来源）
├── lib/                  构建产物，勿手改（index.js / client.js / types/）
├── cordis.patch.yml      bundle 补丁：插入本插件，并按 id 关掉内置 open-in-app
├── tsdown.config.ts      双配置：host 出 ESM，client 出 ModuleLoader 闭包工厂
└── tsconfig.json         只出声明（emitDeclarationOnly → lib/types/）
```

**模型核心**：所有启动器都是同一个 `OpenWithItem`（`id / name / path / passCwd`），没有预设与自定义的区分。默认项（`DEFAULT_ITEMS`）仅在设置文档**不存在**时作为种子写入，host 逐项把裸命令解析为绝对路径后落盘；此后每项就是普通项，可改名、改路径、隐藏、删除。要使一项不可被删除，并不存在这种情况——设计上所有项一律平等。

`lib/` 与 `package.json#exports` 的子路径一一对应：`.` → `lib/index.js`、`./client` → `lib/client.js`、`./locale/*.json` → `locale/*.json`。展示名与描述只来自 `locale/*.json` 的 `meta`（`package.json` 的 `name` / `description` 仅作 fallback），`locale/en.json` 是 DSH 的发现基线，缺了整包元数据就不生效。

**如何新增一个启动器**：

1. **UI 方式（推荐，无需改代码）**：设置页 → Open With → 「+ Add」，填写名称与可执行文件绝对路径；支持拖拽排序与可见性控制。
2. **代码方式（想作为默认项内置）**：修改 `src/shared.ts` 的 `DEFAULT_ITEMS` 数组即可——因为所有项本就统一，新增默认项只需补一条 `{ id, name, path, passCwd }`，无需改动类型或启动分发。首次写入时 host 会解析并落盘。

---

## 🤝 贡献

欢迎以下方向的 PR：

- 🍎🐧 **macOS / Linux 平台适配**：实现各平台的 shell、文件管理器启动与图标提取。
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