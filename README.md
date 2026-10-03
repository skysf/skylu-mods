# skylu-mods

Mods and plugins for [Claude Code](https://claude.com/claude-code), by [skylu](https://www.skylu.ai).

skylu 做的 Claude Code mod 与插件。

## Install · 安装

Add this marketplace once, then install any plugin in it:

添加一次这个插件市场，之后就能安装里面的任何插件：

```bash
claude plugin marketplace add skysf/skylu-mods
claude plugin install context-bar@skylu
```

Start a new Claude Code session afterwards. You can also browse and install from inside Claude Code with `/plugin`.

装完后新开一个 Claude Code 会话即可生效。也可以在 Claude Code 里输入 `/plugin`，在界面里浏览和安装。

## Plugins · 插件

| Plugin · 插件 | What it does · 作用 |
| --- | --- |
| [context-bar](plugins/context-bar) | Your context window as a stacked bar above the prompt, one color per `/context` category; click a category to see what fills it. <br> 在提示框上方用彩色堆叠条显示上下文窗口的占用，每种颜色对应 `/context` 的一个分类，点击分类可以看明细。 |

## Update · 更新

```bash
claude plugin marketplace update skylu
claude plugin update context-bar@skylu
```

Run these whenever you want the latest version, then start a new session.

想要最新版时运行这两条命令，然后新开一个会话。

## Uninstall · 卸载

```bash
claude plugin uninstall context-bar@skylu
claude plugin marketplace remove skylu   # also remove the marketplace · 连市场一起移除
```

## Requirements · 要求

- Claude Code 2.1.288 or newer; update with `claude update`. <br> 需要 Claude Code 2.1.288 或更新版本，用 `claude update` 升级。
- The mods here use Claude Code's mod API, which is in early access and may change between releases. <br> 这里的 mod 用的是 Claude Code 还在早期预览阶段的 mod 接口，可能随版本变化。
- Organizations that restrict third-party plugins may not allow installing them. <br> 限制第三方插件的组织环境可能无法安装。

## Development · 开发

Run `scripts/check.sh` before every release. It runs Claude Code's validation and every plugin's tests, and catches what the plugin directory's scan would hold for a reviewer.

每次发布前运行 `scripts/check.sh`：它会跑 Claude Code 的格式校验和每个插件的测试，并提前发现官方目录扫描会卡住的写法。

## License · 许可证

[MIT](LICENSE) © [skylu](https://www.skylu.ai)
