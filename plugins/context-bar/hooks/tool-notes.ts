// One line on what each built-in tool is, for the System tools pane. The lines
// live in each language's file (lang/<code>.ts), written by hand from the
// tools' own descriptions and short enough to sit beside the name (at most 32
// cells, a test holds it). A tool no language lists falls back to the first
// sentence of the description the engine sent the model, which is English.

import type { ContextBarLanguage } from '../types'
import { PACKS } from './i18n'

/** The line for `name` in `language`: the written note, else the description's first sentence. */
export function aboutTool(
  name: string,
  summary: string | undefined,
  language: ContextBarLanguage,
): string | undefined {
  return PACKS[language].notes[name] ?? (summary === undefined || summary === '' ? undefined : summary)
}

/**
 * The first sentence of a tool description, on its first line, without a
 * leading list or heading mark: "Executes a bash command and returns its
 * output." An "e.g." or "i.e." inside does not end it.
 */
export function firstSentence(description: string): string {
  const line = description.split('\n').find(l => l.trim() !== '')?.trim() ?? ''
  const text = line.replace(/^[#>*\-\s]+/, '')
  for (const match of text.matchAll(/[.!?](?=\s|$)/g)) {
    const at = match.index ?? 0
    if (/(?:^|[^a-z])(?:e\.g|i\.e|etc|vs)$/i.test(text.slice(Math.max(0, at - 4), at))) continue
    return text.slice(0, at + 1)
  }
  return text
}
