export type ContextBarKind = 'used' | 'free' | 'buffer'

/** The language the pane writes in: the person's, Chinese or else English. */
export type ContextBarLanguage = 'zh' | 'en'

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
      /** Taken from the person's prompts; kept across sessions in the store too. */
      language: ContextBarLanguage
      /** The category the detail pane shows, `*` for all of them; null when closed. */
      selected: string | null
    }
  }
}
