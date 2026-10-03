// Terminal cell widths, pure: CJK and full-width forms take two cells, the rest
// one. Enough for what this mod draws (no emoji, no combining marks).

export function charCells(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0
  const isWide =
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  return isWide ? 2 : 1
}

export function cellWidth(text: string): number {
  let cells = 0
  for (const ch of text) cells += charCells(ch)
  return cells
}

/** Keeps the start, `…` where the rest was cut: at most `max` cells. */
export function truncateEnd(text: string, max: number): string {
  if (cellWidth(text) <= max) return text
  if (max <= 0) return ''
  let out = ''
  let used = 0
  for (const ch of text) {
    const w = charCells(ch)
    if (used + w > max - 1) break
    out += ch
    used += w
  }
  return `${out}…`
}

/** Keeps both ends, `…` in the middle: `~/a/b…/CLAUDE.md`, at most `max` cells. */
export function truncateMiddle(text: string, max: number): string {
  if (cellWidth(text) <= max) return text
  if (max <= 1) return max === 1 ? '…' : ''
  const chars = [...text]
  const headRoom = Math.ceil((max - 1) / 2)
  const tailRoom = Math.floor((max - 1) / 2)
  let head = ''
  let used = 0
  for (const ch of chars) {
    const w = charCells(ch)
    if (used + w > headRoom) break
    head += ch
    used += w
  }
  let tail = ''
  used = 0
  for (let i = chars.length - 1; i >= 0; i--) {
    const ch = chars[i] ?? ''
    const w = charCells(ch)
    if (used + w > tailRoom) break
    tail = ch + tail
    used += w
  }
  return `${head}…${tail}`
}
