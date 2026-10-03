export type ContextBarKind = 'used' | 'free' | 'buffer'

/** A language the pane writes in. */
export type ContextBarLanguage = 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'es' | 'de' | 'pt'

/** The language picked for the pane, or Auto: the language the person writes in. */
export type ContextBarLanguageMode = 'auto' | ContextBarLanguage

/** One /context row as the bar draws it: deferred rows are left out. */
export type ContextBarCategory = {
  name: string
  tokens: number
  /** The theme key /context draws the row in (`promptBorder`, `inactive`, ...). */
  color: string
  kind: ContextBarKind
}

/** The last breakdown the bar drew from. */
export type ContextBarSnapshot = {
  categories: ContextBarCategory[]
  totalTokens: number
  maxTokens: number
  percentage: number
}

/** One line of a category's detail: a file, a tool, a skill. */
export type ContextBarItem = {
  name: string
  tokens: number
  /** Where it comes from (`Project`, a server, `plugin`), when known. */
  note?: string
  /** What it is, in a line (a tool's), drawn beside the name or under it. */
  about?: string
}

/** The lists under /context's grid, kept for the detail pane. */
export type ContextBarDetails = {
  memoryFiles: ContextBarItem[]
  /** Only the MCP tools whose schemas are in the window now. */
  mcpTools: ContextBarItem[]
  skills: ContextBarItem[]
  agents: ContextBarItem[]
  /** The last response's input, split by the prompt cache. */
  apiUsage: { input: number; cacheRead: number; cacheWrite: number } | null
  autoCompactThreshold: number | null
}

/** A built-in tool's description as the engine sent it to the model. */
export type ContextBarToolSize = {
  chars: number
  /** Behind ToolSearch: not in the window, so not in "System tools". */
  isDeferred: boolean
  /** The description's first sentence; absent in sizes an older version kept. */
  summary?: string
}

declare module 'claude-code' {
  interface PluginState {
    'context-bar': {
      snapshot: ContextBarSnapshot | null
      isShown: boolean
      details: ContextBarDetails | null
      /** By tool name, from `tool.describe`; kept across reloads. */
      toolSizes: Record<string, ContextBarToolSize>
      /** Detected from the person's prompts while the mode is Auto; kept in the store too. */
      language: ContextBarLanguage
      /** Picked with the pane's buttons or `/context-bar lang`; kept in the store too. */
      languageMode: ContextBarLanguageMode
      /** The category the detail pane shows, `*` for all of them; null when closed. */
      selected: string | null
    }
  }
}
