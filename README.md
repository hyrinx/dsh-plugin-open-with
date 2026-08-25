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

## 🧩 功能

- 💊 **胶囊拆分按钮**：左半边执行当前选择的启动器；右半边下拉菜单列出全部启动器，点击即切换并立即启动。
- 🛠 **四个内置启动器**：
  - **VS Code**：解析 PATH 上的 VS Code CLI，通过 `cmd /c` 启动。
  - **CMD / PowerShell**：开独立控制台窗口并定位到工作区。
  - **文件资源管理器**：调用 `explorer.exe` 打开工作区。
- ⚙️ **设置页面**：在 DSH 设置面板中注入「Open With」配置区域，支持：
  - **当前项选择**：点击卡片切换当前启动器，胶囊按钮同步更新。
  - **拖拽排序** 🆕：预设项和自定义项各自组内拖拽重排，插入线指示落点。胶囊菜单排序与设置页所见即所得。
  - **可见性控制** 🆕：每项支持独立隐藏/显示，胶囊菜单仅展示可见项。
  - **自定义项管理** 🆕：添加/编辑自定义启动器，填写名称和路径；保存后立即关闭表单，图标后台自动提取；路径自动清除首尾引号兼容粘贴。
  - **持久化存储**：设置自动保存到 host 端文件系统，重启后保持。
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

1. **Loopback 通道**：`/open-with` RPC 以 `authority: 'loopback'` 注册，仅本机回环访问可用。
2. **封闭枚举 target**：启动目标为 TypeScript closed union，非法值无法进入可执行文件名。
3. **工作区路径来自会话 snapshot**：不接受 URL 参数或外部输入。

---

## 🚧 已知限制

- **仅支持 Windows**：macOS / Linux 适配需要社区贡献。
- **必须通过本机浏览器回环访问**（`localhost` / `127.0.0.1`）。
- **VS Code 需要先把 `code` 命令加入 PATH**：VS Code 命令面板 → `Shell Command: Install 'code' command in PATH`。
- **终端使用系统自带 cmd.exe / powershell.exe**：自定义启动器支持任意 .exe 路径。
- **图标提取仅支持 .exe 文件**：后台异步执行，保存后可能短暂显示默认图标。

---

## 🏗 构建与扩展

```sh
npm install
npm run build       # tsdown 产出 lib/ 主/客两端 bundle + lib/types/*.d.ts
npm run typecheck   # tsc -p tsconfig.json --noEmit
npm pack            # 发布前预览 tarball 内容
npm publish --access public
```

**如何新增一个启动器**：

通过设置页 UI 添加自定义项即可（推荐，无需改代码）：在 DSH 设置面板 → Open With → Custom 区域点击「+ Add」，填写应用名称和 .exe 路径。图标自动提取，支持拖拽排序和可见性控制。

---

## 🤝 贡献

欢迎以下方向的 PR：

- 🍎🐧 **macOS / Linux 平台适配**：实现各平台的 shell、文件管理器启动和
- 🖥 **更多 IDE 启动器**：JetBrains 全家桶、Sublime Text、Neovide、Cursor、Windsurf……
- 💻 **更多终端候选**：Windows Terminal (`wt`)、PowerShell 7 (`pwsh`)、Git Bash、Alacritty、WezTerm……
- ⚙️ **设置页增强**：导入/导出配置、批量操作
- 🎨 **UI 反馈**：把 `launching` / `opened` / `failed` 状态接入 React render

提 PR 前请确保：

```sh
npm run typecheck   # 通过
npm run build       # 通过
npm pack            # 无 WARN / error
```

---

## 📜 License

MIT © [hyrinx](https://github.com/hyrinx)。详见 [LICENSE](LICENSE)。
