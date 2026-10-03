// The pane's words in Chinese and English, and which one the person writes in.
// Pure: no `$`, so the tests reach it directly.
//
// Only what the mod writes itself is here: category names, tool names and
// paths come from the engine and stay as they are.

import type { ContextBarLanguage } from '../types'

/**
 * The language of the person's own words in `text`, or undefined when there
 * is too little to tell (`ok`, `1`, a slash command), which keeps the last one.
 *
 * Chinese when Han characters carry it (at least two, and no fewer than the
 * Latin words around them: `把 register.tsx 里的 schedule 挪到顶层` is Chinese);
 * English for three Latin words and no Han at all, and for Japanese or Korean:
 * everything not Chinese reads English. Code, links and paths are not words.
 */
export function detectLanguage(text: string): ContextBarLanguage | undefined {
  if (text.trimStart().startsWith('/')) return undefined
  const own = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(?:~|\.{1,2})?(?:\/[\w.@-]+)+/g, ' ')
  let han = 0
  let kanaOrHangul = 0
  for (const ch of own) {
    const cp = ch.codePointAt(0) ?? 0
    if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)) han += 1
    else if ((cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x1100 && cp <= 0x11ff)) {
      kanaOrHangul += 1
    }
  }
  const latinWords = (own.match(/[A-Za-z]{2,}/g) ?? []).length
  if (kanaOrHangul > 0) return 'en'
  if (han >= 2 && han >= latinWords) return 'zh'
  if (han === 0 && latinWords >= 3) return 'en'
  return undefined
}

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
  headline: (tokens: string, share: string, max: string) => string
}

export const TEXT: Readonly<Record<ContextBarLanguage, Strings>> = {
  en: {
    allCategories: 'All categories',
    pressCategory: 'Press a category to see what it holds.',
    back: '‹ All categories',
    noFigures: 'No context figures yet.',
    nothingItemized: 'Nothing itemized for it yet.',
    toolsPending: 'Tool sizes fill in after your next message.',
    toolsEstimate: (itemized, total) =>
      `≈ each tool's description, about 4 characters a token: ≈${itemized} of ${total}.`,
    toolsRest: "The rest is the tools' input schemas, which no interface itemizes.",
    memoryHint: 'Edit or prune them with /memory.',
    messages: 'The conversation so far: prompts, replies, tool calls and results.',
    cacheRead: 'Read from the prompt cache',
    cacheWrite: 'Written to the prompt cache',
    notCached: 'Not cached',
    cacheNote: "Above: how the last request's whole input met the prompt cache.",
    freeLeft: free => `${free} left before the window is full.`,
    autoCompact: (at, left) => `Auto-compact runs at ${at}, ${left} from here.`,
    buffer: 'Kept free so auto-compact has room to write its summary.',
    systemPrompt: "Claude Code's own instructions to the model.",
    mcpInstructions: 'What the connected MCP servers ask the model to know.',
    noBreakdown: 'No itemized breakdown for this category.',
    headline: (tokens, share, max) => `${tokens} · ${share} of ${max}`,
  },
  zh: {
    allCategories: '全部分类',
    pressCategory: '点一个分类，看看里面都是什么。',
    back: '‹ 全部分类',
    noFigures: '还没有上下文数据。',
    nothingItemized: '这一类暂时没有明细。',
    toolsPending: '发下一条消息后，这里会列出每个工具的大小。',
    toolsEstimate: (itemized, total) =>
      `≈ 按每个工具说明的长度估算（约 4 个字符算 1 个 token）：列出的 ≈${itemized} / 总共 ${total}。`,
    toolsRest: '其余是各工具的参数 schema，没有接口能逐个拆出来。',
    memoryHint: '用 /memory 编辑或删减。',
    messages: '到目前为止的对话：你的消息、回复、工具调用和结果。',
    cacheRead: '从 prompt 缓存读取',
    cacheWrite: '写入 prompt 缓存',
    notCached: '没走缓存',
    cacheNote: '上面是最近一次请求的全部输入里，各有多少走了 prompt 缓存。',
    freeLeft: free => `还剩 ${free}，用完窗口就满了。`,
    autoCompact: (at, left) => `到 ${at} 时自动压缩，还差 ${left}。`,
    buffer: '预留出来，让自动压缩有地方写摘要。',
    systemPrompt: 'Claude Code 自己给模型的指令。',
    mcpInstructions: '已连接的 MCP 服务器要模型知道的说明。',
    noBreakdown: '这一类没有可拆分的明细。',
    headline: (tokens, share, max) => `${tokens} · 占 ${max} 的 ${share}`,
  },
}
