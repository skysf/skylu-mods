// The bar's arithmetic, pure: which cells each category gets and the legend
// line. No `$`, so the tests reach it directly.

import type { ContextBarCategory, ContextBarKind, ContextBarSnapshot } from '../types'

export type BarSegment = ContextBarCategory & { cells: number }

const GLYPH: Record<ContextBarKind, string> = { used: '█', free: '░', buffer: '▒' }

export const glyphFor = (kind: ContextBarKind) => GLYPH[kind]

const ORDER: Record<ContextBarKind, number> = { used: 0, free: 1, buffer: 2 }

/**
 * Splits `width` cells among the categories by their tokens: what is used
 * first, largest first, then the free space, then the compaction buffer.
 *
 * The cells always add up to `width` exactly (largest remainder), and every
 * row with tokens gets at least one cell while there is room for that.
 */
export function allocate(categories: readonly ContextBarCategory[], width: number): BarSegment[] {
  const rows = ordered(categories)
  const total = rows.reduce((sum, c) => sum + c.tokens, 0)
  if (total <= 0 || width <= 0) return []

  const slots = rows.map(c => {
    const exact = (c.tokens / total) * width
    return { c, exact, cells: Math.floor(exact) }
  })
  if (rows.length <= width) {
    for (const s of slots) if (s.cells === 0) s.cells = 1
  }

  // Short of the width: the largest remainders get a cell more. Over it (the
  // one-cell floor overshot): the most over-served give one back.
  let diff = width - slots.reduce((sum, s) => sum + s.cells, 0)
  while (diff > 0) {
    const best = slots.reduce((a, b) => (b.exact - b.cells > a.exact - a.cells ? b : a))
    best.cells += 1
    diff -= 1
  }
  while (diff < 0) {
    const givers = slots.filter(s => s.cells > 1)
    if (givers.length === 0) break
    const best = givers.reduce((a, b) => (b.cells - b.exact > a.cells - a.exact ? b : a))
    best.cells -= 1
    diff += 1
  }

  return slots.filter(s => s.cells > 0).map(s => ({ ...s.c, cells: s.cells }))
}

/** 950 → "950", 45_210 → "45.2k", 200_000 → "200k", 1_000_000 → "1M". */
export function compactCount(n: number): string {
  const scaled = (v: number, unit: string) => {
    const text = v >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString()
    return `${text}${unit}`
  }
  if (n >= 1_000_000) return scaled(n / 1_000_000, 'M')
  if (n >= 1_000) return scaled(n / 1_000, 'k')
  return Math.round(n).toString()
}

export type LegendItem = { name: string; glyph: string; color: string; label: string }

/**
 * The line under the bar: the fill first, then one item per category in the
 * bar's order, as many as fit `width`; the rest are counted as "+N".
 */
export function legend(
  snapshot: ContextBarSnapshot,
  width: number,
): { summary: string; items: LegendItem[]; hidden: number } {
  const summary = `${compactCount(snapshot.totalTokens)}/${compactCount(snapshot.maxTokens)} (${Math.round(snapshot.percentage)}%)`
  const all = ordered(snapshot.categories)
  const items: LegendItem[] = []
  let used = summary.length
  for (const [i, c] of all.entries()) {
    const label = `${c.name} ${compactCount(c.tokens)}`
    const cost = 2 + 2 + label.length // "  " + glyph + " " + label
    const left = all.length - i - 1
    const reserve = left > 0 ? ` +${left}`.length : 0
    if (used + cost + reserve > width) break
    items.push({ name: c.name, glyph: glyphFor(c.kind), color: c.color, label })
    used += cost
  }
  return { summary, items, hidden: all.length - items.length }
}

/**
 * The rows with tokens: used ones largest first, then free, then buffer. The
 * free space stays after what is used even when it is the largest, so the bar
 * reads "used | left"; equal sizes keep /context's order.
 */
export function ordered(categories: readonly ContextBarCategory[]): ContextBarCategory[] {
  return categories
    .filter(c => c.tokens > 0)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => ORDER[a.c.kind] - ORDER[b.c.kind] || b.c.tokens - a.c.tokens || a.i - b.i)
    .map(({ c }) => c)
}
