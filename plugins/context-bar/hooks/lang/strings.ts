// What one language gives the pane: its own name, the words the pane writes,
// and a line on each built-in tool. One file per language beside this one;
// i18n.ts lists them. Category names, tool names and paths come from Claude
// Code and stay as they are.
//
// Strings are joined with +, never with template-literal placeholders:
// Anthropic's plugin directory reads those as shell expansions
// (scripts/check.sh holds this).

export type Strings = {
  allCategories: string
  pressCategory: string
  back: string
  noFigures: string
  nothingItemized: string
  toolsPending: string
  toolsEstimate: (itemized: string, total: string) => string
  toolsRest: string
  memoryHint: string
  messages: string
  cacheRead: string
  cacheWrite: string
  notCached: string
  cacheNote: string
  freeLeft: (free: string) => string
  autoCompact: (at: string, left: string) => string
  buffer: string
  systemPrompt: string
  mcpInstructions: string
  noBreakdown: string
  headline: (amount: string, share: string, max: string) => string
  more: (count: number) => string
  /** Before the language buttons. */
  language: string
  /** The button that follows the language the person writes in. */
  auto: string
}

export type LanguagePack = {
  /** The language's name in itself: the button that picks it. */
  name: string
  strings: Strings
  /** By built-in tool name; at most 32 cells each, so it fits beside the name. */
  notes: Readonly<Record<string, string>>
}
