# Context Bar · Privacy Policy · 隐私政策

Last updated: 2026-10-03 · 最后更新：2026-10-03

Context Bar is a Claude Code plugin by [skylu](https://www.skylu.ai). It runs entirely on your computer, inside Claude Code's plugin runtime.

Context Bar 是 [skylu](https://www.skylu.ai) 做的 Claude Code 插件，完全在你的电脑上、在 Claude Code 的插件环境里运行。

## What it reads · 读取什么

- **Claude Code's context figures**, the same breakdown `/context` shows, including the paths of memory files (such as `CLAUDE.md`) and the names and sizes of skills, agents and tools. <br> **Claude Code 的上下文统计**，和 `/context` 显示的是同一份，包括记忆文件（比如 `CLAUDE.md`）的路径，以及 skills、agents、工具的名字和大小。
- **The descriptions of Claude Code's built-in tools**, to estimate their size. <br> **Claude Code 内置工具的说明**，用来估算它们的大小。
- **The text of the prompts you send**, only while the language is set to Auto (the default), to tell which language you write in. The text is looked at in memory and dropped right away. When you pick a language, prompts are not read at all. <br> **你发出的消息文字**，仅在语言设为「自动」（默认）时读取，只用来判断你用的是哪种语言。文字只在内存里看一眼，随即丢弃。你选定某种语言后，就完全不读消息。

## What it keeps · 保存什么

- **Three settings**, in Claude Code's plugin store on your computer: whether the bar is shown, the language you picked for the panel (or Auto), and under Auto the language last detected. None of them identifies you. <br> **三项设置**，存在你电脑上 Claude Code 的插件存储里：是否显示横条、你给面板选的语言（或「自动」）、「自动」时最近判断出的语言。这几项都不能识别你的身份。
- **While a session runs**, the latest context figures and tool sizes, held by Claude Code for that session to draw the bar and the panel. <br> **会话进行期间**，最新的上下文统计和工具大小由 Claude Code 为这个会话保存，用来画横条和面板。

## What it never does · 绝不做什么

- It sends nothing over the network. It has no server and uses no third-party service. <br> 不通过网络发送任何东西。它没有服务器，也不使用任何第三方服务。
- It doesn't read or write your files, run commands, or read environment variables or credentials. <br> 不读写你的文件，不执行命令，不读取环境变量或任何凭据。
- It doesn't keep the text of your prompts, and it collects no analytics or telemetry. <br> 不保留你的消息文字，不收集任何统计或遥测数据。

## Turning it off · 关闭与卸载

Run `/context-bar off` to hide the bar, or uninstall the plugin with `claude plugin uninstall context-bar@skylu`.

输入 `/context-bar off` 可以隐藏横条；用 `claude plugin uninstall context-bar@skylu` 可以卸载插件。

## Contact · 联系

Open an issue at [github.com/skysf/skylu-mods/issues](https://github.com/skysf/skylu-mods/issues), or visit [www.skylu.ai](https://www.skylu.ai).

在 [github.com/skysf/skylu-mods/issues](https://github.com/skysf/skylu-mods/issues) 提 issue，或访问 [www.skylu.ai](https://www.skylu.ai)。

## Changes · 变更

Changes to this policy are published in this file, with the date at the top.

本政策如有变更，会更新在这个文件里，并修改顶部的日期。
