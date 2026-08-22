# dsh-plugin-open-with 发布流程

> 本文档面向维护者，记录把本插件作为**公共 npm 包**发布到 npmjs.com 的完整步骤。
> 源码仓库：<https://github.com/hyrinx/dsh-plugin-open-with> · 克隆命令：`git clone https://github.com/hyrinx/dsh-plugin-open-with.git`
>
> 适用环境：Windows PowerShell 5+、Node.js 22.19+ / 24+、已安装 npm 且能访问 registry.npmjs.org。

---

## 0. 发布前一次性准备（第一次发版做一次即可）

### 0.1 注册 npm 账号 & 登录本机

如果你还没有 npmjs.com 账号：

1. 打开 <https://www.npmjs.com/signup> 注册一个账号（邮箱需要验证）。
2. 回到终端，执行：

```powershell
npm login
```

按提示输入用户名、密码、邮箱、2FA 一次性验证码（如果开了）。登录成功后验证：

```powershell
npm whoami
# 输出你的用户名即为正常
```

### 0.2 校验 Node / npm 版本

本插件要求 Node 22.19+ 或 24+（`package.json` 中 `engines.node` 声明），构建脚本使用 `tsdown + rolldown`，版本不匹配会导致产出物与本地不一致：

```powershell
node --version   # 例：v22.19.0 及以上
npm --version    # 例：10.9.0 及以上
```

如果 Node 版本不对，推荐用 `nvm-windows` 切换。

---

## 1. 每次发版前必须检查

### 1.1 更新版本号（最重要）

**npm 拒绝同一个版本号发两次**。每次发布必须先改 `package.json` 里的 `version`：

```json
{
  "version": "0.1.0"   // 已发过 → 改成 0.1.1（最小 patch 递增）
}
```

版本号遵循 [SemVer 2.0](https://semver.org/lang/zh-CN/)：

| 变更幅度 | 改哪一位 | 示例 |
|---|---|---|
| bug 修复、样式微调、不影响 API | 第 3 位（PATCH） | `0.1.0` → `0.1.1` |
| 新增功能（例如新增"打开 IDEA"目标）、向后兼容 | 第 2 位（MINOR） | `0.1.1` → `0.2.0` |
| 破坏性变更（host API 变了、老用户升级后不能用） | 第 1 位（MAJOR） | `0.2.0` → `1.0.0` |

> 发 Beta / RC 测试版的情况见文末 §4 扩展。

### 1.2 跑一遍构建 + 类型检查

```powershell
cd d:\Desktop\DeepSeekHarness\plugin\open-with
npm run typecheck   # 确保 TS 没报错
npm run build       # 确保 build 成功产出 lib/index.js + lib/client.js
```

任何一步失败都 **不要发布**，先修问题。

---

## 2. 发布三步（正式流程）

### 第 1 步：预览包内容（强烈建议做）

`npm pack --dry-run` 不会真的打包，只输出"即将被打进去的文件清单"，用来确认 `src/`、`script/`、`assets/`、`tsconfig.json` 等开发期文件有没有被误塞进去：

```powershell
cd d:\Desktop\DeepSeekHarness\plugin\open-with
npm pack --dry-run
```

**预期的输出应该只有这些**（多了少了都不正常）：

```
Tarball Contents
  README.md
  README.zh.md
  cordis.patch.yml
  lib/client.js                 ← host 注入的 client bundle
  lib/client.js.map             ← sourcemap
  lib/client/*.js               ← 中间产物（不影响，只是 tsdown 默认输出）
  lib/index.js                  ← host ESM 入口
  lib/index.js.map
  lib/invariant.js
  lib/types/**/*.d.ts           ← 类型声明
  package.json
```

**如果你看到以下任意文件出现在清单里，立刻停**，检查 `package.json` 的 `files` 字段是否被改坏了：
- `src/` 开头的任何文件
- `script/extract-icons.ps1`
- `assets/vscode.png` / `cmd.png` / `explorer.png`
- `assets-to-base64.mjs`
- `tsconfig.json` / `tsdown.config.ts`
- `package-lock.json`（这个 npm 默认就排除，看到才是异常）

### 第 2 步：本地打 tgz + 安装验证（可选但推荐）

`npm pack`（不带 `--dry-run`）会真的生成 `.tgz` 文件，然后你可以在一个临时目录装这个 tgz 模拟用户安装：

```powershell
cd d:\Desktop\DeepSeekHarness\plugin\open-with
npm pack
# 生成：dsh-plugin-open-with-0.1.0.tgz（版本号随你改的）

# 新建临时目录安装验证
mkdir ..\..\tmp-test-pkg -Force
cd ..\..\tmp-test-pkg
npm init -y
npm i ..\plugin\open-with\dsh-plugin-open-with-0.1.0.tgz

# 验证 1：能否正确解析入口
node -e "console.log(require.resolve('dsh-plugin-open-with'))"
node -e "console.log(require.resolve('dsh-plugin-open-with/client'))"
# 两个都能输出完整路径即正常

# 验证 2：dsh 能否 add 这个本地 tgz
dsh plugin --profile web add d:\Desktop\DeepSeekHarness\tmp-test-pkg\node_modules\dsh-plugin-open-with
# 打开 dsh web 看按钮是否正常出现、图标是否彩色、菜单能不能弹

# 验证完清掉临时目录即可
cd d:\Desktop\DeepSeekHarness\plugin\open-with
Remove-Item ..\..\tmp-test-pkg -Recurse -Force
Remove-Item dsh-plugin-open-with-*.tgz   # 也可以保留做归档
```

### 第 3 步：正式发布

确认前两步没问题，最后执行：

```powershell
cd d:\Desktop\DeepSeekHarness\plugin\open-with
npm publish --access public
```

参数说明：
- `--access public`：明确声明发布为公共包（免费）；即使包名目前不带 scope 也建议写上，以后加 `@你的用户名/` 前缀时不用改命令。
- 如果你开启了 2FA，会提示输入一次性验证码。

成功会输出类似：

```
npm notice Publishing to https://registry.npmjs.org/
+ dsh-plugin-open-with@0.1.0
```

然后立刻可以在 <https://www.npmjs.com/package/dsh-plugin-open-with> 看到你的包（页面通常 10–30 秒后刷新出来）。

---

## 3. 发布后验证（5 分钟搞定）

打开一个**干净目录**（不在本项目里，避免 link: 协议干扰），模拟第三方用户安装：

```powershell
mkdir d:\tmp-dsh-user
cd d:\tmp-dsh-user
npm init -y
npm i dsh-plugin-open-with    # 走公网 registry，不从本地缓存

# 验证包内容
Get-ChildItem node_modules\dsh-plugin-open-with
# 期望：lib/、cordis.patch.yml、README.md、README.zh.md、package.json

# 验证 dsh 插件管理器安装
dsh plugin --profile web add dsh-plugin-open-with
```

然后打开 dsh web，至少测三点：
1. 会话头部出现胶囊按钮，图标是彩色的（不是黑的）
2. 左按钮点击能正常打开 VS Code（或你当前默认 target）
3. 右按钮点击弹出菜单，菜单项有彩色图标，选一个能正常启动对应应用

测完卸载：

```powershell
dsh plugin --profile web remove dsh-plugin-open-with
cd d:\ ; Remove-Item d:\tmp-dsh-user -Recurse -Force
```

---

## 4. 扩展场景

### 4.1 发布 Beta / RC 测试版

有些变更你想先发给几个志愿者试用，不想让默认 `npm i` 拉到，用 `--tag`：

```powershell
# 先把版本号改成带后缀
#   package.json  version: "0.2.0-beta.1"
npm publish --access public --tag next
```

用户默认 `npm i dsh-plugin-open-with` 拿到的仍是正式版；想尝鲜的用户：

```powershell
npm i dsh-plugin-open-with@next
```

### 4.2 包名被抢了怎么办？

如果 `dsh-plugin-open-with` 已经被别人发了（`npm publish` 会报错 `403 Forbidden - You cannot publish over previously published versions` 或者 `402 Payment Required`），不用抢，改成带个人作用域的名字：

1. 到 npm 个人 Settings → Packages，确认你的用户名。
2. 改 `package.json` 的 `name`：
   ```json
   "name": "@你的用户名/dsh-plugin-open-with"
   ```
3. 其他不变，照常发布：`npm publish --access public`。
   `publishConfig.access: public` 已经在 `package.json` 里写好了，不会被当作私有包收费。

### 4.3 废弃一个版本

发现某个版本有严重 bug 不想让用户再装：

```powershell
npm deprecate dsh-plugin-open-with@0.1.1 "这个版本有 VS Code 启动失败 bug，请升级到 0.1.2 或更高"
```

npm install 时用户会看到红色警告但仍能装。彻底删除某个版本（24 小时内才行）：

```powershell
npm unpublish dsh-plugin-open-with@0.1.1
```

> 超过 24 小时的版本 npm 不允许删除（防止供应链攻击），只能 deprecate。

---

## 5. 常见错误速查

| 错误信息 | 根因 | 解决方案 |
|---|---|---|
| `npm ERR! code E401\nYou must be logged in` | 没登录 npm | `npm login` 重新登录 |
| `npm ERR! code EPUBLISHCONFLICT\nCannot publish over existing version` | 版本号没改，发了一个已经存在的版本号 | 去 `package.json` 把 `version` 调高一位再发 |
| `npm ERR! code E403\n403 Forbidden` | 包名已被别人占用且你不是维护者 | 按 §4.2 改成 `@你的用户名/dsh-plugin-open-with` |
| `npm ERR! code EBADENGINE` | 你的 Node 版本低于 `engines.node` 要求 | 用 nvm 切到 Node 22.19+ 或 24+ |
| `npm ERR! prepack failed\n'tsdown' 不是内部或外部命令` | `node_modules` 丢了（通常你清了缓存） | `npm install` 把 devDependencies 装回来 |
| `Tarball Contents` 里出现 `src/` 或 `script/` | `files` 白名单被改坏了 | 确认 `package.json` 的 `files: ["lib","cordis.patch.yml","README.md","README.zh.md"]` 未被删除 |
| 发布成功但 `dsh plugin add` 说找不到 `client.js` | 漏跑了 build 或 `prepack` 被删掉 | 手动 `npm run build` 后重新 `npm publish` |

---

## 6. 本包特有的发布约定

1. **图标不需要用户单独提取** — `prepack` → `npm run assets` → `assets-to-base64.mjs` 会把 `assets/*.png` embed 到 `src/assets.ts`，最终打包进 `lib/client.js`。最终用户 `npm i` 直接就能拿到彩色图标，不需要跑 PowerShell 脚本。
2. **只支持 Windows** — `package.json` 写了 `"os": ["win32"]`，macOS/Linux 用户安装时会看到 `EBADPLATFORM` 警告，这是故意的（host 端调用 cmd.exe / explorer.exe / Code.exe 在那些系统上本来也跑不起来）。
3. **`react` 和 `@deepseek-ai/*` 全部 optional peer** — 不强制宿主在 install 时解 peer，避免 pnpm 的 peer 严格模式卡死；实际运行时 dsh 插件管理器会通过 inject 注入。
