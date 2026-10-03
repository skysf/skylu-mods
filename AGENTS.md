# AGENTS.md — skylu-mods 协作规则

本仓库是 skylu 的 Claude Code mod / 插件市场：GitHub `skysf/skylu-mods`，marketplace 名 `skylu`，本机位置 `~/.claude/mods`。
所有 AI 代理（Claude、Codex……）和人都按这里的规则改，委派子代理时把本文件一并交代。本文件是唯一的规则入口：
不另建 CLAUDE.md 之类的第二份；某个插件自己的说明写在它的 README 里。

## 仓库结构

- `.claude-plugin/marketplace.json`：插件目录，每个插件一条（`name`、`source: "./plugins/<name>"`、`category`、`tags`）。
  版本号只写在各插件自己的 `plugin.json` 里，不写在这里。
- `plugins/<name>/`：每个插件一个文件夹，自成一体。安装时 Claude Code 只把这个文件夹拷进缓存，插件之间不能互相 import，
  共用的小工具各带一份。现有插件：`context-bar`（mod）。
  - `.claude-plugin/plugin.json`：name、displayName、version、description、author（skylu / https://www.skylu.ai，不写邮箱）、
    homepage、repository、license（MIT）、keywords、documentationUrl、supportUrl、privacyPolicyUrl、types。
  - `.claude-plugin/icon.png`：官方目录的图标，512–2048 像素的方形 PNG（现在是 1024）。门户只在**第一次保存或提交**时
    采用一次，之后再改也不生效。
  - `hooks/`（mod 代码）、`types/index.d.ts`（`$.state` 的合同）、`tests/`、`README.md`（中英双语，也是官方目录的商店页）、
    `PRIVACY.md`、`LICENSE`、`screenshots/`。
  - `.claude-plugin/types/`：Claude Code 加载 mod 时自动生成的类型文件，里面有本机连着的 MCP 工具清单。已 gitignore，**永远不提交**。
- `scripts/check.sh`：发版前的全部检查，一条命令。

## 本机开发

- 开发版由 `~/.claude/settings.json` 的 `env.CLAUDE_CODE_PLUGIN_DIRS` 加载，指向 `~/.claude/mods/plugins/<name>`，
  多个插件用 `:` 隔开。改了文件，开着的会话会自动重载；新加的路径要新开会话才生效。
- 本机**不要**再从 `skylu` marketplace 安装同名插件，会和开发版撞名。
- 想看别人装上之后的样子，用一份临时配置模拟，不碰真实配置（bash、zsh 都能用）：

  ```bash
  T=$(mktemp -d); mkdir -p "$T/cfg" "$T/work"
  c() { env -u CLAUDE_CODE_PLUGIN_DIRS CLAUDE_CONFIG_DIR="$T/cfg" claude "$@" < /dev/null; }
  c plugin marketplace add skysf/skylu-mods && c plugin install <name>@skylu && c plugin details <name>@skylu
  (cd "$T/work" && c -p "/<命令>")
  rm -rf "$T"
  ```

  `skysf/skylu-mods` 装的是 GitHub 上 main 的版本；要测本机还没合并的改动，换成 `~/.claude/mods`。
- 类型检查：`npx -y -p typescript@5 tsc -p plugins/<name>`（插件要先被 Claude Code 加载过一次，生成类型文件）。
- 这台 Mac 的终端跑在 Rosetta 下，用 Python 的 PIL 处理图片时要加 `arch -arm64`。

## 写代码的硬规矩

1. **插件文件里不许出现模板字符串的占位符（美元符号加花括号），注释里也不行。** 官方目录的安全扫描把它当成 shell 变量：
   `hooks/i18n.ts` 里一个占位符写着 `tokens`，被判成「读取安装者的凭据」；测试里 `+` 后面跟着一个占位符，被判成
   「运行时拼出来的命令」。每个版本都因此挂上 Policy hold，等人工审核。字符串一律用 `+` 拼。只有 Claude Code 自己的变量
   （`CLAUDE_PLUGIN_ROOT`、`CLAUDE_PLUGIN_DATA`、`CLAUDE_PROJECT_DIR`、`user_config.*`）可以这样写。`scripts/check.sh` 会查这一条。
2. 起名字时尽量避开 Token、Secret、Password、ApiKey 这类字眼，算是保险。名字本身会不会触发扫描没有证实过，
   第 1 条才是查实的原因；现有代码里还有 `tokens` 字段。
3. mod 里的 `$` 只能传给**本文件顶层声明的函数**，否则 `claude plugin validate` 会拒。
4. 默认不联网、不读写文件、不执行命令。真要用，先想清楚，并在 README 和 PRIVACY.md 里写明：官方目录要求说清插件运行、
   发送、获取的一切。
5. 界面文字放在各语言文件里（context-bar 是 `hooks/lang/<code>.ts`，共 8 种语言）。新加一句文字，8 种语言都要补上；
   工具说明每条不超过 32 格（中日韩一个字算 2 格）。测试会查这两条。
6. 代码注释用英文（现有风格）；commit、分支名、PR 这些 GitHub 上的文字用英文；README 中英双语；本文件用中文。

## 发版流程（每次改动都走）

1. 开分支，不直推 main（用户的 Claude Code 钩子会拦）：`git checkout -b <name>-<版本>`。
2. 改代码、补测试，`plugin.json` 的 `version` **必须升**：别人的 `claude plugin update` 和官方目录都靠版本号判断有没有新版本。
3. `scripts/check.sh` 全绿（查占位符，validate marketplace 和每个插件，跑每个插件的测试），再跑一遍 tsc。
4. 修 bug 或加守卫要做**反向验证**：临时改坏，确认测试变红，再恢复。恢复用备份文件，别用 `git checkout`，它会冲掉没提交的改动。
5. commit（结尾带 `Co-Authored-By`）→ `git push -u origin <分支>` → `gh pr create` →
   `gh pr merge <N> --merge --delete-branch`。**只用 `--merge`，绝不 squash。**
6. `git checkout main && git pull --ff-only && git fetch --prune` → `claude plugin tag plugins/<name> --push`
   （打 `<name>--v<版本>` 标签；只改了仓库根目录的文件时不用打）。
7. 官方目录盯着 main：发现新提交就扫描（设了 GitHub push webhook 是推送后马上查，没设就等定时检查；想马上查，
   在门户的插件页点 **Check for new commits**）。扫描通过后按插件的发布设置上线，见下一节。

## 官方目录（Anthropic Directory）

- 门户 https://claude.ai/directory/manage 。每个插件文件夹单独投稿，Plugin path 填 `plugins/<name>`；
  官方目录只读、只扫描这个文件夹，仓库根目录的文件（本文件、`scripts/`）不在里面。
- context-bar 于 2026-10-03 提交了 v0.2.3。现在的发布设置是「每个版本都由 Anthropic 审核员发布」
  （Auto-publish 一栏写着 Doesn't apply for now）：新版本扫描通过后，到插件页点 **Publish**，审核员过目后才上线。
  审核员批准时可能改成「首版之后自动上线」，以门户 Overview 页的 Auto-publish 一栏为准。
- 新版本上线之前，商店页一直是上一个已发布的版本。一个版本扫描没过，后面的版本也要等审核员放行。
- webhook 可选，随时在插件页 **Settings → Updates → Set up** 补设。secret 直接填进 GitHub，别贴到聊天里。
- 名字别让人以为是官方出品：`claude-mods` 是保留名（插件名会被 validate 拒），名字里最好也别带 claude、anthropic。
- 门户报的「Unrecognized field」警告（它不认识 plugin.json 里的几个字段，比如 privacyPolicyUrl）可以保留，门户自己说没关系；
  本机 `claude plugin validate` 不报。

## README 与截图

- 插件 README 开头是「效果」一节，分「终端（Claude Code CLI）」和「Claude Code 桌面版」两组，每张截图配一句中英说明。
- 截图放 `plugins/<name>/screenshots/`，命名 `terminal-*.png` / `desktop-*.png`，用 Markdown 图片语法引用。
- **公开前裁掉提示行和状态栏**：里面有文件夹名、用量、项目脚本名这些个人信息。
- README 至少 40 个词，写清插件读什么、存什么、不做什么。

## 新增一个插件

1. 在 `plugins/` 下新建文件夹（结构照 context-bar），写 `plugin.json`、中英双语 README、LICENSE；
   读写任何数据就写 PRIVACY.md，并在 `plugin.json` 里填 `privacyPolicyUrl`。用 plugin-authoring skill 起草时，
   它会先写进 `~/.claude/dev-mods/<会话>/`，做完挪进 `plugins/`。
2. 在 `.claude-plugin/marketplace.json` 的 `plugins` 里加一条。
3. 把路径接进 `~/.claude/settings.json` 的 `CLAUDE_CODE_PLUGIN_DIRS`（用 `:` 接在后面），新开会话生效。
4. 仓库 README 的插件表加一行。
5. 走发版流程。要上官方目录，就去门户为它单独投一次稿；图标第一次就要放好。
