// One line on what each built-in tool is, for the System tools pane, in Chinese
// and English: written by hand from the tools' own descriptions, short enough
// to sit beside the name (at most 32 cells, a test holds it). A tool not listed
// here falls back to the first sentence of the description the engine sent the
// model, which is English in either language.

import type { ContextBarLanguage } from '../types'

type Note = Readonly<Record<ContextBarLanguage, string>>

const AGENT: Note = { zh: '派子代理独立完成多步任务', en: 'Hands a task to a subagent' }

const NOTES: Readonly<Record<string, Note>> = {
  Agent: AGENT,
  Task: AGENT,
  Artifact: { zh: '把 HTML 发布成 claude.ai 网页', en: 'Publishes HTML to claude.ai' },
  ArtifactComments: { zh: '读、回复 Artifact 上的评论', en: 'Reads and answers page comments' },
  ArtifactData: { zh: '读写 Artifact 页面的共享数据', en: "Reads/writes an artifact's data" },
  AskUserQuestion: { zh: '要你拍板时弹出选择题', en: 'Asks you to decide, with choices' },
  Bash: { zh: '执行终端 shell 命令', en: 'Runs shell commands' },
  CronCreate: { zh: '到点或按周期跑一个 prompt', en: 'Runs a prompt on a schedule' },
  CronDelete: { zh: '取消一个定时任务', en: 'Cancels a scheduled prompt' },
  CronList: { zh: '列出本会话的定时任务', en: 'Lists scheduled prompts' },
  DesignSync: { zh: '同步 claude.ai 设计系统项目', en: 'Syncs claude.ai design systems' },
  Edit: { zh: '按精确字符串替换改文件', en: 'Replaces exact text in a file' },
  EndConversation: { zh: '遇到持续辱骂时结束对话', en: 'Ends the chat on sustained abuse' },
  EnterPlanMode: { zh: '进入计划模式：先出方案再动手', en: 'Plan first, act once you approve' },
  ExitPlanMode: { zh: '交出方案请你批准', en: 'Hands you the plan to approve' },
  EnterWorktree: { zh: '切进独立的 git worktree', en: 'Works in a separate git worktree' },
  ExitWorktree: { zh: '离开 worktree，回原目录', en: 'Leaves the git worktree' },
  Glob: { zh: '按文件名模式找文件', en: 'Finds files by name pattern' },
  Grep: { zh: '按内容搜索文件', en: 'Searches file contents' },
  ListAgents: { zh: '列出能发消息的子代理和会话', en: 'Lists agents it can message' },
  ListMcpResourcesTool: { zh: '列出 MCP 服务器的资源', en: "Lists MCP servers' resources" },
  ReadMcpResourceTool: { zh: '读取一个 MCP 资源', en: 'Reads one MCP resource' },
  ReadMcpResourceDirTool: { zh: '列出 MCP 资源目录的内容', en: 'Lists an MCP resource directory' },
  Monitor: { zh: '后台盯脚本输出，每行通知一次', en: 'Streams events from a script' },
  NotebookEdit: { zh: '编辑 Jupyter notebook 单元格', en: 'Edits Jupyter notebook cells' },
  PushNotification: { zh: '发桌面通知（可推到手机）', en: 'Notifies you (desktop or phone)' },
  Read: { zh: '读文件，也能看图片和 PDF', en: 'Reads files, images and PDFs' },
  RemoteTrigger: { zh: '管理 claude.ai 上的定时云端任务', en: 'Manages scheduled cloud routines' },
  ReportFindings: { zh: '代码审查时列出发现的问题', en: 'Lists code review findings' },
  ScheduleWakeup: { zh: '/loop 循环时定下次何时醒来', en: 'Sets when /loop wakes up next' },
  SendFeedback: { zh: '起草产品反馈，经你同意才发出', en: 'Drafts feedback for you to send' },
  SendMessage: { zh: '给子代理或其他会话发消息', en: 'Messages an agent or session' },
  Skill: { zh: '调用 skill（打包好的做事说明）', en: 'Runs a skill (packaged know-how)' },
  TaskStop: { zh: '停掉一个后台任务', en: 'Stops a background task' },
  TodoWrite: { zh: '维护本次任务的待办清单', en: "Keeps the task's to-do list" },
  ToolSearch: { zh: '按需加载暂缓的工具定义', en: 'Loads deferred tools on demand' },
  WebFetch: { zh: '抓取网页内容', en: 'Fetches a web page' },
  WebSearch: { zh: '上网搜索', en: 'Searches the web' },
  Workflow: { zh: '编排多个子代理的工作流', en: 'Runs a multi-agent workflow' },
  Write: { zh: '新建或整个覆盖一个文件', en: 'Creates or overwrites a file' },
}

export const TOOL_NOTES = NOTES

/** The line for `name` in `language`: the written note, else the description's first sentence. */
export function aboutTool(
  name: string,
  summary: string | undefined,
  language: ContextBarLanguage,
): string | undefined {
  return NOTES[name]?.[language] ?? (summary === undefined || summary === '' ? undefined : summary)
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
