import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionContextBreakdown, SessionUsage } from 'claude-code'

import type { ContextBarCategory, ContextBarLanguage, ContextBarSnapshot, ContextBarToolSize } from '../types'
import { allocate, compactCount, legend } from '../hooks/bar'
import { cellWidth, truncateEnd, truncateMiddle } from '../hooks/cells'
import { ALL, detailView, shortPath } from '../hooks/detail'
import { LANGUAGES, PACKS, TEXT, detectLanguage, parseLanguageMode } from '../hooks/i18n'
import { aboutTool, firstSentence } from '../hooks/tool-notes'
import { toDetails, toSnapshot } from '../hooks/snapshot'

const SYSTEM: ContextBarCategory = { name: 'System prompt', tokens: 3_000, color: 'promptBorder', kind: 'used' }
const TOOLS: ContextBarCategory = { name: 'System tools', tokens: 12_000, color: 'inactive', kind: 'used' }
const MEMORY: ContextBarCategory = { name: 'Memory files', tokens: 40, color: 'claude', kind: 'used' }
const MESSAGES: ContextBarCategory = { name: 'Messages', tokens: 30_000, color: 'permission', kind: 'used' }
const FREE: ContextBarCategory = { name: 'Free space', tokens: 122_000, color: 'promptBorder', kind: 'free' }
const BUFFER: ContextBarCategory = { name: 'Autocompact buffer', tokens: 33_000, color: 'warning', kind: 'buffer' }
const CATEGORIES = [SYSTEM, TOOLS, MEMORY, MESSAGES, FREE, BUFFER]
// The order the bar draws them in: used largest first, then free, then buffer.
const BY_SIZE = [MESSAGES, TOOLS, SYSTEM, MEMORY, FREE, BUFFER]

const BREAKDOWN: SessionContextBreakdown = {
  categories: [
    // Out of order on purpose, and one deferred row the bar must leave out.
    { ...BUFFER, isDeferred: false },
    { ...SYSTEM, isDeferred: false },
    { ...TOOLS, isDeferred: false },
    { name: 'MCP tools (deferred)', tokens: 9_000, color: 'success', kind: 'deferred', isDeferred: true },
    { ...MEMORY, isDeferred: false },
    { ...MESSAGES, isDeferred: false },
    { ...FREE, isDeferred: false },
  ],
  totalTokens: 45_040,
  maxTokens: 200_000,
  rawMaxTokens: 200_000,
  autocompactSource: 'auto',
  percentage: 23,
  gridRows: [],
  model: 'claude-opus-5-5',
  memoryFiles: [
    { path: '/Users/me/.claude/CLAUDE.md', type: 'User', tokens: 30 },
    { path: '/Users/me/project/AGENTS.md', type: 'Project', tokens: 10 },
  ],
  mcpTools: [
    { name: 'mcp__docs__search', serverName: 'docs', tokens: 500, isLoaded: false },
  ],
  agents: [],
  isAutoCompactEnabled: true,
  autoCompactThreshold: 167_000,
  apiUsage: { input_tokens: 40, output_tokens: 900, cache_read_input_tokens: 40_000, cache_creation_input_tokens: 5_000 },
}

// What `tool.describe` showed: whole descriptions, one tool behind ToolSearch.
const TOOL_SIZES: Record<string, ContextBarToolSize> = {
  Read: { chars: 790, isDeferred: false },
  Bash: { chars: 1_183, isDeferred: false },
  Monitor: { chars: 6_581, isDeferred: true },
}
const ENGINE = { plugin: 'engine', tier: 'core' as const }

const USAGE: SessionUsage = {
  startedAt: 0,
  context: { window: 200_000, tokens: 45_040, percent: 23, breakdown: BREAKDOWN },
  rateLimits: [],
}

const BAND = (bodyColumns: number) => ({
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
})

const PANE_PROPS = (bodyColumns: number) => ({
  title: 'Context',
  isFocused: false,
  bodyColumns,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
})

const RUN = (args: string) => ({
  command: 'context-bar',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

describe('allocate', () => {
  test('fills the width exactly, every row at least one cell, used largest first then free then buffer', () => {
    for (let width = CATEGORIES.length; width <= 240; width++) {
      const segments = allocate(CATEGORIES, width)
      expect(segments.reduce((sum, s) => sum + s.cells, 0)).toBe(width)
      expect(segments.map(s => s.name)).toEqual(BY_SIZE.map(c => c.name))
      for (const s of segments) expect(s.cells).toBeGreaterThanOrEqual(1)
    }
  })

  test('cells follow the tokens', () => {
    const segments = allocate(CATEGORIES, 200)
    const cells = Object.fromEntries(segments.map(s => [s.name, s.cells]))
    // 200 cells over 200,040 tokens: about one cell per thousand tokens.
    expect(cells['Messages']).toBe(30)
    expect(cells['Free space']).toBeGreaterThanOrEqual(121)
    expect(cells['Free space']).toBeLessThanOrEqual(122)
    expect(cells['Memory files']).toBe(1)
  })

  test('free space stays after what is used even when it is the largest', () => {
    const big: ContextBarCategory = { ...FREE, tokens: 900_000 }
    const tiny: ContextBarCategory = { ...BUFFER, tokens: 10 }
    const names = allocate([tiny, SYSTEM, big, MEMORY, MESSAGES], 100).map(s => s.name)
    expect(names).toEqual(['Messages', 'System prompt', 'Memory files', 'Free space', 'Autocompact buffer'])
  })

  test('narrower than the rows: still exactly the width', () => {
    const segments = allocate(CATEGORIES, 3)
    expect(segments.reduce((sum, s) => sum + s.cells, 0)).toBe(3)
  })

  test('nothing to draw', () => {
    expect(allocate([], 80)).toEqual([])
    expect(allocate(CATEGORIES, 0)).toEqual([])
  })
})

describe('legend', () => {
  const snap: ContextBarSnapshot = {
    categories: CATEGORIES,
    totalTokens: 45_040,
    maxTokens: 200_000,
    percentage: 23,
  }

  test('never wider than the band', () => {
    for (let width = 20; width <= 240; width += 7) {
      const line = legend(snap, width)
      const length =
        line.summary.length +
        line.items.reduce((sum, i) => sum + 2 + i.glyph.length + 1 + i.label.length, 0) +
        (line.hidden > 0 ? (' +' + line.hidden).length : 0)
      expect(length).toBeLessThanOrEqual(width)
      expect(line.items.length + line.hidden).toBe(CATEGORIES.length)
    }
  })

  test('tokens read short', () => {
    expect(compactCount(950)).toBe('950')
    expect(compactCount(45_210)).toBe('45.2k')
    expect(compactCount(200_000)).toBe('200k')
    expect(compactCount(1_000_000)).toBe('1M')
    expect(legend(snap, 200).summary).toBe('45k/200k (23%)')
  })
})

describe('detail pane content', () => {
  const snap = toSnapshot(BREAKDOWN)
  const details = toDetails(BREAKDOWN)
  const view = (
    selected: string,
    toolSizes: Record<string, ContextBarToolSize>,
    width: number,
    language: ContextBarLanguage = 'en',
  ) => detailView({ selected, snapshot: snap, details, toolSizes, width, language })

  test('system tools: whole descriptions, largest first, the deferred left out, marked as estimates', () => {
    const v = view('System tools', TOOL_SIZES, 60)
    expect(v.rows.map(r => r.name)).toEqual(['Bash', 'Read'])
    expect(v.rows.map(r => r.tokens.trim())).toEqual(['≈296', '≈198'])
    expect(v.rows[0]?.bar).toBe('██████████')
    expect(v.rows[1]?.bar).toBe('███████   ')
    expect(v.headline).toBe('12k · 6% of 200k')
    expect(v.notes[0]).toBe("≈ each tool's description, about 4 characters a token: ≈494 of 12k.")
  })

  test('system tools: each tool says what it is, beside its name, in the language asked', () => {
    const en = view('System tools', TOOL_SIZES, 60)
    expect(en.rows.map(r => r.about)).toEqual(['Runs shell commands', 'Reads files, images and PDFs'])
    expect(en.aboutPlacement).toBe('inline')
    const zh = view('System tools', TOOL_SIZES, 60, 'zh')
    expect(zh.rows.map(r => r.about)).toEqual(['执行终端 shell 命令', '读文件，也能看图片和 PDF'])
    expect(zh.notes[1]).toBe('其余是各工具的参数 schema，没有接口能逐个拆出来。')
    expect(zh.headline).toBe('12k · 占 200k 的 6%')
  })

  test('the pane writes in Chinese too; names from the engine stay as they are', () => {
    const overview = view(ALL, TOOL_SIZES, 60, 'zh')
    expect(overview.title).toBe('全部分类')
    expect(overview.rows.map(r => r.name)).toEqual(BY_SIZE.map(c => c.name))
    const free = view('Free space', TOOL_SIZES, 60, 'zh')
    expect(free.notes).toEqual(['还剩 122k，用完窗口就满了。', '到 167k 时自动压缩，还差 122k。'])
    const messages = view('Messages', TOOL_SIZES, 60, 'zh')
    expect(messages.rows.map(r => r.name)).toEqual(['缓存读取', '缓存写入', '未走缓存'])
    expect(view('Memory files', TOOL_SIZES, 60, 'zh').rows[0]?.label).toBe('~/.claude/CLAUDE.md  User')
  })

  test('system tools before any tool was described', () => {
    const v = view('System tools', {}, 60)
    expect(v.rows).toHaveLength(0)
    expect(v.notes).toEqual(['Tool sizes fill in after your next message.'])
  })

  test('memory files: paths under the home folder shortened, kind beside them', () => {
    const v = view('Memory files', TOOL_SIZES, 60)
    expect(v.rows.map(r => r.label)).toEqual(['~/.claude/CLAUDE.md  User', '~/project/AGENTS.md  Project'])
  })

  test('messages: the last request split by the prompt cache', () => {
    const v = view('Messages', TOOL_SIZES, 60)
    expect(v.rows.map(r => [r.name, r.tokens.trim()])).toEqual([
      ['Cache read', '40k'],
      ['Cache write', '5k'],
      ['Not cached', '40'],
    ])
  })

  test('free space: how far auto-compact is', () => {
    const v = view('Free space', TOOL_SIZES, 60)
    expect(v.rows).toHaveLength(0)
    expect(v.notes).toContain('Auto-compact runs at 167k, 122k from here.')
  })

  test('deferred MCP tools are not listed as loaded', () => {
    expect(details.mcpTools).toEqual([])
  })

  test('overview: every category, largest used first, each one opens itself', () => {
    const v = view(ALL, TOOL_SIZES, 60)
    expect(v.rows.map(r => r.opens)).toEqual(BY_SIZE.map(c => c.name))
    expect(v.rows.map(r => r.color)).toEqual(BY_SIZE.map(c => c.color))
  })

  test('overview: bars against the largest used category, none for the free space', () => {
    const bars = Object.fromEntries(view(ALL, TOOL_SIZES, 60).rows.map(r => [r.name, r.bar]))
    // Messages 30k is the largest used: a full bar; System tools 12k: 4 of 10.
    expect(bars['Messages']).toBe('██████████')
    expect(bars['System tools']).toBe('████      ')
    expect(bars['Memory files']).toBe('█         ')
    expect(bars['Free space']).toBe('          ')
    expect(bars['Autocompact buffer']).toBe('          ')
  })

  test('bars get shorter in a narrow pane, leaving the labels room', () => {
    expect(view('System tools', TOOL_SIZES, 60).labelColumn).toBe(19)
    expect(view('System tools', TOOL_SIZES, 45).labelColumn).toBe(15)
    expect(view('System tools', TOOL_SIZES, 36).labelColumn).toBe(13)
    expect(view('Messages', TOOL_SIZES, 36, 'zh').rows.map(r => r.label)).toEqual(['缓存读取', '缓存写入', '未走缓存'])
  })

  test('labels never run past the pane', () => {
    for (const width of [20, 30, 45, 80]) {
      const v = view('Memory files', TOOL_SIZES, width)
      for (const row of v.rows) {
        expect(row.bar.length + row.tokens.length + 2 + cellWidth(row.label)).toBeLessThanOrEqual(Math.max(width, 27))
      }
    }
    expect(truncateMiddle('abcdefghij', 5)).toBe('ab…ij')
    expect(shortPath('/home/sam/x.md')).toBe('~/x.md')
  })

  // The tools of a real session, the longest name 15 cells: the pane the
  // person had open was about 68 columns wide.
  const SESSION_TOOLS: Record<string, ContextBarToolSize> = {
    Artifact: { chars: 18_000, isDeferred: false, summary: 'The Artifact tool renders an HTML file as an Artifact.' },
    SendFeedback: { chars: 3_468, isDeferred: false, summary: 'Use this tool to draft feedback about Claude Code.' },
    AskUserQuestion: { chars: 1_788, isDeferred: false, summary: 'Use this tool only when you are blocked.' },
    Read: { chars: 790, isDeferred: false, summary: 'Reads a file from the local filesystem.' },
  }

  test('wide enough: every note in one column beside the names, none cut', () => {
    const v = detailView({ selected: 'System tools', snapshot: snap, details, toolSizes: SESSION_TOOLS, width: 68, language: 'zh' })
    expect(v.aboutPlacement).toBe('inline')
    expect(v.nameWidth).toBe(15)
    expect(v.rows.map(r => r.about)).toEqual([
      '把 HTML 发布成 claude.ai 网页',
      '起草产品反馈，经你同意才发出',
      '要你拍板时弹出选择题',
      '读文件，也能看图片和 PDF',
    ])
    for (const row of v.rows) {
      expect(v.labelColumn + v.nameWidth + 2 + cellWidth(row.about ?? '')).toBeLessThanOrEqual(68)
    }
  })

  test('too narrow beside the names: each note goes under its name, cut to fit', () => {
    const v = detailView({ selected: 'System tools', snapshot: snap, details, toolSizes: SESSION_TOOLS, width: 50, language: 'zh' })
    expect(v.aboutPlacement).toBe('below')
    for (const row of v.rows) {
      expect(v.labelColumn + cellWidth(row.about ?? '')).toBeLessThanOrEqual(50)
    }
    expect(v.rows[0]?.about).toBe('把 HTML 发布成 claude.ai 网页')
  })
})

describe('tool notes', () => {
  test('every language has a note for every tool, each fitting beside the names in a 68-column pane', () => {
    const tools = Object.keys(PACKS.en.notes)
    expect(tools.length).toBeGreaterThanOrEqual(40)
    for (const language of LANGUAGES) {
      const notes = PACKS[language].notes
      expect(Object.keys(notes).sort(), language + ' lists other tools than English').toEqual([...tools].sort())
      for (const tool of tools) {
        const note = notes[tool] ?? ''
        expect(note.trim(), tool + ' (' + language + ') is empty').not.toBe('')
        expect(cellWidth(note), tool + ' (' + language + '): ' + note).toBeLessThanOrEqual(32)
      }
    }
  })

  test('a tool without a written note says the first sentence of its description', () => {
    expect(aboutTool('Artifact', 'Renders HTML.', 'zh')).toBe('把 HTML 发布成 claude.ai 网页')
    expect(aboutTool('Artifact', 'Renders HTML.', 'en')).toBe('Publishes HTML to claude.ai')
    expect(aboutTool('SendFeedback', undefined, 'en')).toBe('Drafts feedback for you to send')
    expect(aboutTool('Mystery', 'Does a thing.', 'zh')).toBe('Does a thing.')
    expect(aboutTool('Mystery', undefined, 'en')).toBeUndefined()
  })

  test('first sentence: first line, list marks off, e.g. does not end it', () => {
    expect(firstSentence('Executes a bash command and returns its output.\n\n- more')).toBe(
      'Executes a bash command and returns its output.',
    )
    expect(firstSentence('- Stops a task. Takes an id.')).toBe('Stops a task.')
    expect(firstSentence('Picks one, e.g. the first. Then more.')).toBe('Picks one, e.g. the first.')
    expect(firstSentence('\n\nList the children of a directory')).toBe('List the children of a directory')
  })

  test('cells: CJK and full-width forms are two cells', () => {
    expect(cellWidth('发布')).toBe(4)
    expect(cellWidth('claude.ai 网页')).toBe(14)
    expect(cellWidth('（可推到手机）')).toBe(14)
    expect(truncateEnd('把 HTML 发布成', 8)).toBe('把 HTML…')
    expect(cellWidth(truncateEnd('起草产品反馈，经你同意才发出', 9))).toBeLessThanOrEqual(9)
  })
})

describe('the person\'s language', () => {
  test('Chinese, including Chinese around code, file names and English terms', () => {
    expect(detectLanguage('这个context bar我想优化下，就是把占比最大的排在最前面')).toBe('zh')
    expect(detectLanguage('把 register.tsx 里的 schedule 挪到顶层')).toBe('zh')
    expect(detectLanguage('需要')).toBe('zh')
    expect(detectLanguage('fix 一下')).toBe('zh')
    expect(detectLanguage('看下 `const x = foo(bar, baz, qux)` 这行')).toBe('zh')
  })

  test('Japanese by its kana, Korean by Hangul', () => {
    expect(detectLanguage('このバーをもっと小さくして')).toBe('ja')
    expect(detectLanguage('設定を変更してください')).toBe('ja')
    expect(detectLanguage('이 막대를 더 작게 만들어 주세요')).toBe('ko')
  })

  test('Latin-script languages by their common words and letters', () => {
    expect(detectLanguage('create a mod that draws my context window as a stacked bar')).toBe('en')
    expect(detectLanguage('make the notes shorter please')).toBe('en')
    expect(detectLanguage('Peux-tu rendre la barre plus petite et plus claire ?')).toBe('fr')
    expect(detectLanguage('¿Puedes hacer la barra más pequeña y más clara?')).toBe('es')
    expect(detectLanguage('Mach das bitte kleiner und schneller')).toBe('de')
    expect(detectLanguage('Você pode deixar a barra menor e mais clara?')).toBe('pt')
  })

  test('a language name, code or word picks it for /context-bar lang', () => {
    expect(parseLanguageMode('ja')).toBe('ja')
    expect(parseLanguageMode('Français')).toBe('fr')
    expect(parseLanguageMode('spanish')).toBe('es')
    expect(parseLanguageMode('中文')).toBe('zh')
    expect(parseLanguageMode('AUTO')).toBe('auto')
    expect(parseLanguageMode('klingon')).toBeUndefined()
  })

  test('too little to tell keeps the last one', () => {
    for (const text of ['ok', '1', 'yes', '/context-bar on', '', '👍', 'run 测']) {
      expect(detectLanguage(text), text).toBeUndefined()
    }
  })

  test('a Chinese question over a pasted English log is not English', () => {
    const log = Array.from({ length: 40 }, (_, i) => 'Error at line ' + i + ' in module loader').join('\n')
    expect(detectLanguage('这个报错怎么回事\n' + log)).toBeUndefined()
  })

  test('every language has every line, and a name of its own', () => {
    for (const language of LANGUAGES) {
      expect(Object.keys(TEXT[language]).sort(), language).toEqual(Object.keys(TEXT.en).sort())
      expect(PACKS[language].name.trim()).not.toBe('')
    }
    expect(new Set(LANGUAGES.map(l => PACKS[l].name)).size).toBe(LANGUAGES.length)
  })
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(surface + ": draws the bar in the categories' colors, and /context-bar hides it", async ($, on) => {
    mock.store(on)
    on('session.usage', () => ({ value: USAGE }))
    // The engine draws nothing of its own in the band.
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box' as const }))

    await $.command.run(RUN('on'))
    const ui = await $.ui.mount({
      plugin: 'context-bar',
      surface,
      component: 'AbovePrompt',
      props: BAND(80),
    })

    const row = await ui.find({ type: 'Box', key: 'bar' })
    const bar = (row?.children ?? []) as { props: Record<string, unknown>; children: string[] }[]
    const barText = (t: (typeof bar)[number]) => t.children.join('')
    expect(bar.map(t => t.props.color)).toEqual(BY_SIZE.map(c => c.color))
    expect(bar.every(t => /^[█░▒]+$/.test(barText(t)))).toBe(true)
    expect(bar.reduce((sum, t) => sum + barText(t).length, 0)).toBe(80)
    expect(bar.some(t => t.props.color === 'success')).toBe(false)
    expect((await ui.find({ key: 'summary' }))?.text).toBe('45k/200k (23%)')

    const off = await $.command.run(RUN(''))
    expect(off.text).toBe('Context bar off.')
    const hidden = await $.ui.mount({
      plugin: 'context-bar',
      surface,
      component: 'AbovePrompt',
      props: BAND(80),
    })
    expect(await hidden.find({ type: 'Box', key: 'bar' })).toBeUndefined()
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(surface + ': pressing a legend entry shows its detail, pressing it again hides it', async ($, on) => {
    mock.store(on)
    on('session.usage', () => ({ value: USAGE }))
    on('tool.describe', ($, e) => ({ description: e.description }))
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box' as const }))
    const opened: string[] = []
    const closed: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id + '|' + (e.title ?? ''))
      return { value: { isPlaced: true as const } }
    })
    on('ui.close', ($, e) => {
      closed.push(e.id)
      return { value: undefined }
    })

    await $.tool.describe({ tool: 'Bash', description: 'b'.repeat(1_183), provider: ENGINE })
    await $.tool.describe({ tool: 'Artifact', description: 'a'.repeat(18_000), provider: ENGINE })
    await $.tool.describe({ tool: 'Monitor', description: 'm'.repeat(6_581), isDeferred: true, provider: ENGINE })
    await $.tool.describe({ tool: 'mcp__docs__search', description: 'searches', provider: { plugin: 'mcp:docs', tier: 'user' } })

    await $.command.run(RUN('on'))
    const band = await $.ui.mount({ plugin: 'context-bar', surface, component: 'AbovePrompt', props: BAND(120) })
    await band.press({ key: 'cat:System tools' })

    // A terminal shows it in the band, framed under the bar; elsewhere a pane opens.
    const detail =
      surface === 'terminal'
        ? band
        : await $.ui.mount({ plugin: 'context-bar', surface, component: 'Pane', requestId: 'context-bar-detail', props: PANE_PROPS(60) })
    if (surface === 'terminal') {
      expect(opened).toEqual([])
      expect((await band.find({ type: 'Box', key: 'detail' }))?.props.borderStyle).toBe('round')
    } else {
      expect(opened).toEqual(['context-bar-detail|Context · System tools'])
    }
    expect((await detail.find({ type: 'Text', text: 'System tools' }))?.props.bold).toBe(true)
    expect(await detail.find({ type: 'Text', text: 'Bash' })).toBeDefined()
    expect(await detail.find({ type: 'Text', text: /≈296/ })).toBeDefined()
    expect(await detail.find({ type: 'Text', text: /Publishes HTML to claude\.ai/ })).toBeDefined()
    expect(await detail.find({ type: 'Text', text: 'Monitor' })).toBeUndefined()
    expect(await detail.find({ type: 'Text', text: /mcp__docs/ })).toBeUndefined()

    // From a category back to all of them, then into another one.
    await detail.press({ key: 'all' })
    expect(await detail.find({ key: 'open:Memory files' })).toBeDefined()
    await detail.press({ key: 'open:Memory files' })
    expect(await detail.find({ type: 'Text', text: /CLAUDE\.md/ })).toBeDefined()

    // Pressing the shown entry again hides it.
    await band.press({ key: 'cat:Memory files' })
    if (surface === 'terminal') {
      expect(await band.find({ type: 'Box', key: 'detail' })).toBeUndefined()
      expect(closed).toEqual([])
      // The × in the band hides it too.
      await band.press({ key: 'cat:System tools' })
      expect(await band.find({ type: 'Box', key: 'detail' })).toBeDefined()
      await band.press({ key: 'close' })
      expect(await band.find({ type: 'Box', key: 'detail' })).toBeUndefined()
    } else {
      expect(closed).toEqual(['context-bar-detail'])
      expect(await detail.find({ type: 'Text', text: 'No context figures yet.' })).toBeDefined()
      // A pane has no × of its own drawing: the surface draws the close control.
      expect(await detail.find({ key: 'close' })).toBeUndefined()
    }
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(surface + ': the detail follows the language of the person\'s prompts', async ($, on) => {
    mock.store(on)
    on('session.usage', () => ({ value: USAGE }))
    on('tool.describe', ($, e) => ({ description: e.description }))
    on('prompt.submit', ($, e) => ({ text: e.text }))
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box' as const }))
    on('ui.open', () => ({ value: { isPlaced: true as const } }))
    on('ui.close', () => ({ value: undefined }))
    const say = (text: string, kind: 'composer' | 'peer' = 'composer') =>
      $.prompt.submit({ text, wait: false, origin: { kind } })

    await $.tool.describe({ tool: 'Artifact', description: 'a'.repeat(18_000), provider: ENGINE })
    await $.command.run(RUN('on'))
    const band = await $.ui.mount({ plugin: 'context-bar', surface, component: 'AbovePrompt', props: BAND(120) })
    await band.press({ key: 'cat:System tools' })
    const detail =
      surface === 'terminal'
        ? band
        : await $.ui.mount({ plugin: 'context-bar', surface, component: 'Pane', requestId: 'context-bar-detail', props: PANE_PROPS(80) })

    // Nothing said yet: English.
    expect(await detail.find({ type: 'Text', text: /Publishes HTML to claude\.ai/ })).toBeDefined()

    await say('给每个工具加一句说明')
    expect(await detail.find({ type: 'Text', text: /把 HTML 发布成 claude\.ai 网页/ })).toBeDefined()
    expect(await detail.find({ type: 'Button', key: 'all' })).toMatchObject({ text: '‹ 全部分类' })

    // Too short to tell, and words that are not the person's: no change.
    await say('ok')
    await say('please summarize the build log for me', 'peer')
    expect(await detail.find({ type: 'Text', text: /把 HTML 发布成 claude\.ai 网页/ })).toBeDefined()

    await say('make the notes shorter please')
    expect(await detail.find({ type: 'Text', text: /Publishes HTML to claude\.ai/ })).toBeDefined()
    expect(await detail.find({ type: 'Button', key: 'all' })).toMatchObject({ text: '‹ All categories' })
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(surface + ': a picked language holds, prompts unread; Auto follows them again', async ($, on) => {
    mock.store(on)
    on('session.usage', () => ({ value: USAGE }))
    on('tool.describe', ($, e) => ({ description: e.description }))
    on('prompt.submit', ($, e) => ({ text: e.text }))
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box' as const }))
    on('ui.open', () => ({ value: { isPlaced: true as const } }))
    on('ui.close', () => ({ value: undefined }))
    const say = (text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })

    await $.tool.describe({ tool: 'Artifact', description: 'a'.repeat(18_000), provider: ENGINE })
    await $.command.run(RUN('on'))
    const band = await $.ui.mount({ plugin: 'context-bar', surface, component: 'AbovePrompt', props: BAND(120) })
    await band.press({ key: 'cat:System tools' })
    const detail =
      surface === 'terminal'
        ? band
        : await $.ui.mount({ plugin: 'context-bar', surface, component: 'Pane', requestId: 'context-bar-detail', props: PANE_PROPS(80) })
    const shows = async (pattern: RegExp) => (await detail.find({ type: 'Text', text: pattern })) !== undefined

    // Every language has a button, in its own name; Auto is picked at first.
    for (const code of LANGUAGES) expect(await detail.find({ key: 'lang:' + code })).toBeDefined()
    expect((await detail.find({ key: 'lang:auto' }))?.text).toBe('● Auto')

    await detail.press({ key: 'lang:fr' })
    expect(await shows(/Publie du HTML sur claude\.ai/)).toBe(true)
    expect((await detail.find({ key: 'lang:fr' }))?.text).toBe('● Français')

    // Picked: a Chinese prompt changes nothing.
    await say('给每个工具加一句说明')
    expect(await shows(/Publie du HTML sur claude\.ai/)).toBe(true)

    const reply = await $.command.run(RUN('lang ja'))
    expect(reply.text).toBe('Context bar language: 日本語.')
    expect(await shows(/HTML を claude\.ai で公開/)).toBe(true)

    // Back to Auto: the Chinese prompt sent while a language was picked was
    // never read, so the detail is back to the language seen before (English)...
    await detail.press({ key: 'lang:auto' })
    expect(await shows(/Publishes HTML to claude\.ai/)).toBe(true)
    // ...and the prompts lead again.
    await say('给每个工具加一句说明')
    expect(await shows(/把 HTML 发布成 claude\.ai 网页/)).toBe(true)
    await say('Peux-tu rendre la barre plus petite et plus claire ?')
    expect(await shows(/Publie du HTML sur claude\.ai/)).toBe(true)

    expect((await $.command.run(RUN('lang klingon'))).text).toContain('Unknown language')
  })
}
