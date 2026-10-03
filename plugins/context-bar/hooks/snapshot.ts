// What the mod keeps of /context's breakdown, pure: the rows the bar draws and
// the lists the detail pane draws. No `$`, so the tests reach it directly.

import type { SessionContextBreakdown } from 'claude-code'

import type { ContextBarCategory, ContextBarDetails, ContextBarSnapshot } from '../types'

export function toSnapshot(b: SessionContextBreakdown): ContextBarSnapshot {
  const categories = b.categories.flatMap((c): ContextBarCategory[] =>
    c.kind === 'deferred'
      ? []
      : [{ name: c.name, tokens: Math.max(0, c.tokens), color: c.color, kind: c.kind }],
  )
  return {
    categories,
    totalTokens: b.totalTokens,
    maxTokens: b.rawMaxTokens,
    percentage: b.percentage,
  }
}

/** The lists under /context's grid. The built-in tools are not among them. */
export function toDetails(b: SessionContextBreakdown): ContextBarDetails {
  return {
    memoryFiles: b.memoryFiles.map(f => ({ name: f.path, tokens: f.tokens, note: f.type })),
    mcpTools: b.mcpTools.filter(t => t.isLoaded).map(t => ({ name: t.name, tokens: t.tokens })),
    skills: (b.skills?.skillFrontmatter ?? []).map(s => ({
      name: s.name,
      tokens: s.tokens,
      note: s.pluginName ?? s.source,
    })),
    agents: b.agents.map(a => ({ name: a.agentType, tokens: a.tokens, note: a.source })),
    apiUsage: b.apiUsage
      ? {
          input: b.apiUsage.input_tokens,
          cacheRead: b.apiUsage.cache_read_input_tokens,
          cacheWrite: b.apiUsage.cache_creation_input_tokens,
        }
      : null,
    autoCompactThreshold: b.isAutoCompactEnabled ? (b.autoCompactThreshold ?? null) : null,
  }
}
