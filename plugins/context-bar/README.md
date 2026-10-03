# Context Bar

Your Claude Code context window as a stacked bar above the prompt, one color per `/context` category, so you see at a glance how full the window is and what fills it. Click a category to open a panel with what it holds.

在 Claude Code 的提示框上方，用一条彩色堆叠条显示上下文窗口的占用。每种颜色对应 `/context` 里的一个分类，一眼就能看出窗口用了多少、被什么占着。点击分类会打开一个面板，显示这一类里具体有什么。

```text
████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒
42.7k/1M (4%)  █ System tools 29k  █ Skills 5.8k  █ MCP server instructions 2.8k +3
```

## Install · 安装

```bash
claude plugin marketplace add skysf/skylu-mods
claude plugin install context-bar@skylu
```

Start a new Claude Code session afterwards.

装完后新开一个 Claude Code 会话即可。

## Use · 使用

- **The bar** sits above the prompt and refreshes after each turn, after tool calls and after a compaction. Used categories come first, largest first, then the free space (`░`) and the auto-compact buffer (`▒`). <br> **横条**在提示框上方，每轮对话、工具调用和压缩之后自动刷新。已用的分类排在前面、从大到小，然后是空余（`░`）和自动压缩预留（`▒`）。
- **Details:** click a category under the bar to open a panel with what it holds: memory files, skills, MCP tools, built-in tools with a line on what each one is, and how the last request used the prompt cache. Click the total (`42.7k/1M (4%)`) or `+N` to see every category. Click the same entry again, or press Esc, to close the panel. <br> **明细：**点击横条下面的分类，会打开面板显示这一类里有什么：记忆文件、skills、MCP 工具、内置工具（每个工具附一句说明），以及上一次请求的缓存情况。点击总数或 `+N` 可以看全部分类。再点一次同一项或按 Esc 关闭面板。
- **Clicking** works in Claude Code's fullscreen mode. Otherwise press `ctrl+x tab` to move the focus to the bar and pick an entry with the keyboard. <br> **鼠标点击**需要 Claude Code 的全屏模式；不是全屏时，按 `ctrl+x tab` 把焦点移到横条上，再用键盘选择。
- **`/context-bar`** turns the bar off and on; `/context-bar on` and `/context-bar off` set it. The choice is remembered. <br> **`/context-bar`** 开关横条，`/context-bar on` 和 `/context-bar off` 直接设定，选择会被记住。
- **Language:** the panel follows the language you write in: Chinese when you write Chinese, English otherwise. <br> **语言：**面板跟随你输入的语言：你写中文就显示中文，其余语言显示英文。

## What the numbers are · 数字说明

- The figures are Claude Code's own `/context` breakdown, estimated locally: the same numbers `/context` shows. <br> 数据就是 Claude Code 自己的 `/context` 分类统计（本地估算），和 `/context` 显示的一致。
- A built-in tool's size is estimated from its description, about four characters a token. The tools' input schemas are not itemized, so the rows add up to less than the System tools total. <br> 内置工具的大小按每个工具说明的长度估算（约 4 个字符算 1 个 token）。工具的参数 schema 无法逐个拆分，所以各行加起来会小于 System tools 的总数。

## Privacy · 隐私

Context Bar runs inside Claude Code's plugin runtime. It reads Claude Code's own context figures and tool descriptions, and the text of the prompts you send, only to tell whether you write in Chinese; it keeps nothing of that text. It stores two settings in Claude Code's local plugin store: whether the bar is shown, and your language. It never reads your files, never runs commands, and never sends anything over the network.

Context Bar 运行在 Claude Code 的插件环境里。它读取 Claude Code 自己的上下文统计和工具说明；也会读取你发出的消息文字，但只用来判断你是不是在写中文，不保留任何内容。它在 Claude Code 本地的插件存储里记两项设置：是否显示横条、你的语言。它不读你的文件，不执行命令，也不通过网络发送任何数据。

## What it hooks · 它挂了哪些钩子

Context Bar listens to a few Claude Code events and changes none of them:

Context Bar 只监听下面几个 Claude Code 事件，不修改其中任何一个：

| Event · 事件 | What Context Bar does · 做什么 |
| --- | --- |
| `session.start` | Registers `/context-bar`, reads its two remembered settings and takes the first reading. <br> 注册 `/context-bar` 命令，读取记住的两项设置，取第一次数据。 |
| `command.run` | Answers its own `/context-bar` only; every other command passes through untouched. <br> 只响应自己的 `/context-bar`，其他命令原样放行。 |
| `prompt.submit` | Reads the prompt's text to tell its language; the prompt goes on unchanged and is not kept. <br> 读取你发出的消息文字来判断语言；消息原样发出，不保留。 |
| `tool.describe` | Measures the length of each built-in tool's description; the description reaches the model unchanged. <br> 量每个内置工具说明的长度；说明原样交给模型，不做修改。 |
| `session.measure`, `tool.call`, `session.compact`, `session.end` | Schedules a fresh reading of the context figures, nothing else. <br> 只用来安排刷新上下文数据，不做别的。 |
| `ui.close` | Notes that its own panel was closed. <br> 记录自己的面板已关闭。 |
| `ui.render` | Draws the bar above the prompt and the detail panel. <br> 画提示框上方的横条和明细面板。 |

## Requirements · 要求

- Claude Code 2.1.288 or newer; update with `claude update`. <br> 需要 Claude Code 2.1.288 或更新版本，用 `claude update` 升级。
- Context Bar is built on Claude Code's mod API, which is in early access and may change between releases. <br> Context Bar 基于 Claude Code 还在早期预览阶段的 mod 接口，可能随版本变化。

## License · 许可证

[MIT](LICENSE) © [skylu](https://www.skylu.ai)
