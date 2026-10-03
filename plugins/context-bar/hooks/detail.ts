// The detail pane's content, pure: what one category (or all of them) breaks
// down into, laid out for a given width, in the person's language. No `$`, so
// the tests reach it directly.
//
// /context names its rows in English and gives no stable id, so the lists are
// matched by the row's name; a row this file does not know gets a plain line.

import type {
  ContextBarCategory,
  ContextBarDetails,
  ContextBarItem,
  ContextBarLanguage,
  ContextBarSnapshot,
  ContextBarToolSize,
} from '../types'
import { formatTokens, ordered } from './bar'
import { cellWidth, truncateEnd, truncateMiddle } from './cells'
import { TEXT, type Strings } from './i18n'
import { aboutTool } from './tool-notes'

/** What the pane shows for every category at once. */
export const ALL = '*'

const BAR_CELLS = 10
const MAX_ROWS = 200
/** Cells before a row's label: the bar, the tokens, two spaces. */
export const LABEL_COLUMN = BAR_CELLS + 7 + 2

export type DetailRow = {
  key: string
  /** The item's (or, in the overview, the category's) own name. */
  name: string
  /** `█` cells against the largest row, padded to the bar's width. */
  bar: string
  /** Right-aligned, e.g. ` 12.3k`; `≈` in front when estimated. */
  tokens: string
  label: string
  color: string
  /** Set in the overview: the category a press on the row opens. */
  opens?: string
  /** What the item is (a tool's), cut to fit where it is drawn. */
  about?: string
}

export type DetailView = {
  title: string
  color: string
  /** `29k · 2.9% of 1M`. */
  headline: string
  rows: DetailRow[]
  /** Rows past MAX_ROWS, left out. */
  hidden: number
  notes: string[]
  /**
   * Where the rows' `about` goes: beside the label, in a column `nameWidth`
   * cells after LABEL_COLUMN, when every one fits there; else under the label.
   */
  aboutPlacement: 'inline' | 'below'
  nameWidth: number
}

export type DetailInput = {
  /** A category's name, or ALL. */
  selected: string
  snapshot: ContextBarSnapshot
  details: ContextBarDetails | null
  toolSizes: Readonly<Record<string, ContextBarToolSize>>
  /** The pane's body, in cells. */
  width: number
  language: ContextBarLanguage
}

export function detailView(input: DetailInput): DetailView {
  const { selected, snapshot, width } = input
  const text = TEXT[input.language]
  if (selected === ALL) return overview(snapshot, width, text)

  const category = snapshot.categories.find(c => c.name === selected)
  const tokens = category?.tokens ?? 0
  const color = category?.color ?? 'inactive'
  const headline = text.headline(formatTokens(tokens), share(tokens, snapshot.maxTokens), formatTokens(snapshot.maxTokens))
  const { items, notes, isEstimate } = itemsFor(input, tokens, text)
  return { title: selected, color, headline, notes, ...layout(items, color, width, isEstimate, true) }
}

function overview(snapshot: ContextBarSnapshot, width: number, text: Strings): DetailView {
  const items = ordered(snapshot.categories).map(c => ({ name: c.name, tokens: c.tokens }))
  const colors = new Map(snapshot.categories.map(c => [c.name, c.color]))
  const laid = layout(items, 'inactive', width, false, false)
  return {
    ...laid,
    title: text.allCategories,
    color: 'inactive',
    headline: `${formatTokens(snapshot.totalTokens)}/${formatTokens(snapshot.maxTokens)} (${Math.round(snapshot.percentage)}%)`,
    rows: laid.rows.map(r => ({ ...r, color: colors.get(r.name) ?? r.color, opens: r.name })),
    notes: [text.pressCategory],
  }
}

type Items = { items: ContextBarItem[]; notes: string[]; isEstimate: boolean }

function itemsFor(input: DetailInput, total: number, text: Strings): Items {
  const { snapshot, details } = input
  const n = input.selected.toLowerCase()
  const none = (...notes: string[]): Items => ({ items: [], notes, isEstimate: false })
  const list = (items: ContextBarItem[] | undefined, ...notes: string[]): Items =>
    items && items.length > 0 ? { items, notes, isEstimate: false } : none(text.nothingItemized, ...notes)

  if (n.startsWith('system tools')) {
    const items = builtinTools(input.toolSizes, input.language)
    if (items.length === 0) return none(text.toolsPending)
    const itemized = items.reduce((sum, i) => sum + i.tokens, 0)
    return {
      items,
      notes: [text.toolsEstimate(formatTokens(itemized), formatTokens(total)), text.toolsRest],
      isEstimate: true,
    }
  }
  if (n.startsWith('mcp tools')) return list(details?.mcpTools)
  if (n.startsWith('memory')) return list(details?.memoryFiles, text.memoryHint)
  if (n.startsWith('skills')) return list(details?.skills)
  if (n.includes('agent')) return list(details?.agents)
  if (n.startsWith('messages')) {
    const usage = details?.apiUsage
    if (!usage) return none(text.messages)
    return {
      items: [
        { name: text.cacheRead, tokens: usage.cacheRead },
        { name: text.cacheWrite, tokens: usage.cacheWrite },
        { name: text.notCached, tokens: usage.input },
      ].filter(i => i.tokens > 0),
      notes: [text.messages, text.cacheNote],
      isEstimate: false,
    }
  }
  if (n.startsWith('free')) {
    const free = snapshot.categories.find(c => c.kind === 'free')?.tokens ?? 0
    const threshold = details?.autoCompactThreshold
    return none(
      text.freeLeft(formatTokens(free)),
      ...(threshold
        ? [text.autoCompact(formatTokens(threshold), formatTokens(Math.max(0, threshold - snapshot.totalTokens)))]
        : []),
    )
  }
  if (n.includes('buffer')) return none(text.buffer)
  if (n.startsWith('system prompt')) return none(text.systemPrompt)
  if (n.startsWith('mcp server instructions')) return none(text.mcpInstructions)
  return none(text.noBreakdown)
}

/**
 * The built-in tools in the window, sized by the description the engine sent
 * (`tool.describe`): the ones behind ToolSearch are left out, as /context
 * leaves them out of "System tools".
 */
export function builtinTools(
  toolSizes: Readonly<Record<string, ContextBarToolSize>>,
  language: ContextBarLanguage,
): ContextBarItem[] {
  return Object.entries(toolSizes)
    .filter(([, size]) => !size.isDeferred)
    .map(([name, size]) => ({
      name,
      tokens: Math.ceil(size.chars / 4),
      about: aboutTool(name, size.summary, language),
    }))
}

function layout(
  items: readonly ContextBarItem[],
  color: string,
  width: number,
  isEstimate: boolean,
  isBySize: boolean,
): Pick<DetailView, 'rows' | 'hidden' | 'aboutPlacement' | 'nameWidth'> {
  const sorted = isBySize ? [...items].sort((a, b) => b.tokens - a.tokens) : [...items]
  const shown = sorted.slice(0, MAX_ROWS)
  const max = shown.reduce((m, i) => Math.max(m, i.tokens), 0)
  const labelWidth = Math.max(8, width - LABEL_COLUMN)
  const rows: DetailRow[] = shown.map((item, i) => {
    const cells = max > 0 ? Math.max(item.tokens > 0 ? 1 : 0, Math.round((item.tokens / max) * BAR_CELLS)) : 0
    const label = item.note ? `${shortPath(item.name)}  ${item.note}` : shortPath(item.name)
    return {
      key: `row-${i}`,
      name: item.name,
      bar: '█'.repeat(cells).padEnd(BAR_CELLS),
      tokens: `${isEstimate ? '≈' : ''}${formatTokens(item.tokens)}`.padStart(7),
      label: truncateMiddle(label, labelWidth),
      color,
      about: item.about,
    }
  })

  // Beside the names when every line fits there, in one column; else each
  // under its name, as wide as the label column allows.
  const nameWidth = rows.reduce((m, r) => Math.max(m, cellWidth(r.label)), 0)
  const room = width - LABEL_COLUMN - nameWidth - 2
  const isInline = rows.every(r => r.about === undefined || cellWidth(r.about) <= room)
  return {
    rows: isInline
      ? rows
      : rows.map(r => (r.about === undefined ? r : { ...r, about: truncateEnd(r.about, labelWidth) })),
    hidden: sorted.length - shown.length,
    aboutPlacement: isInline ? 'inline' : 'below',
    nameWidth,
  }
}

function share(tokens: number, max: number): string {
  if (max <= 0) return '0%'
  const pct = (tokens / max) * 100
  return `${pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10}%`
}

/** `/Users/me/x/CLAUDE.md` → `~/x/CLAUDE.md`. */
export function shortPath(name: string): string {
  return name.replace(/^\/(?:Users|home)\/[^/]+\//, '~/')
}

/** The pane's tab title for what it shows. */
export function titleFor(selected: string, categories: readonly ContextBarCategory[]): string {
  if (selected === ALL) return 'Context'
  return categories.some(c => c.name === selected) ? `Context · ${selected}` : 'Context'
}
