// context-bar: the context window as one stacked bar above the prompt, each
// /context category in its own theme color, with a one-line legend under it.
// `/context-bar` toggles it (`on` / `off` set it); the choice is remembered.
//
// Pressing a legend entry shows what that category holds (files, skills,
// tools, ...); pressing the fill (`42k/1M (4%)`) or `+N` shows every
// category, and pressing the same entry again hides it. In a terminal the
// detail opens in the band itself, under the bar, however wide the terminal
// is (Claude Code would dock a pane as a sidebar from 110 columns); elsewhere
// (the desktop app) it opens in a pane.
//
// The detail writes in one of eight languages: the one picked with the
// buttons at its foot or `/context-bar lang <code>`, or under Auto (the
// default) the one the person's prompts are written in. Only Auto reads them.
//
// The figures are /context's own breakdown (`$.session.usage` with
// `breakdown: 'summary'`: estimated locally, no token-count requests), taken
// after each turn, after tool calls (at most every 2 s), after a compaction or
// /clear, and every 15 s as a fallback (a /model switch). The render hooks only
// read what was taken from `$.state`.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface, ResolveInput, Timer } from 'claude-code'

import type { ContextBarLanguageMode } from '../types'
import { allocate, glyphFor, legend } from './bar'
import { ALL, detailView, titleFor } from './detail'
import { LANGUAGES, PACKS, TEXT, detectLanguage, effectiveLanguage, parseLanguageMode } from './i18n'
import { toDetails, toSnapshot } from './snapshot'
import { firstSentence } from './tool-notes'

const snapshot = atom({ plugin: 'context-bar', key: 'snapshot' } as const, null)
const details = atom({ plugin: 'context-bar', key: 'details' } as const, null)
const isShown = atom({ plugin: 'context-bar', key: 'isShown' } as const, true)
const selected = atom({ plugin: 'context-bar', key: 'selected' } as const, null)
const detailPlace = atom({ plugin: 'context-bar', key: 'detailPlace' } as const, 'pane')
const toolSizes = atom({ plugin: 'context-bar', key: 'toolSizes' } as const, {})
const language = atom({ plugin: 'context-bar', key: 'language' } as const, 'en')
const languageMode = atom({ plugin: 'context-bar', key: 'languageMode' } as const, 'auto')

const COMMAND = 'context-bar'
const PANE = 'context-bar-detail'
const STORE_KEY = 'isShown'
const LANGUAGE_KEY = 'language'
const LANGUAGE_MODE_KEY = 'languageMode'
const MODES: readonly ContextBarLanguageMode[] = ['auto', ...LANGUAGES]
/** Whose prompts tell the language: the person's own, typed or sent from a phone or an SDK host. */
const PERSON = new Set(['composer', 'bridge', 'sdk'])
const TOOL_REFRESH_MS = 2_000
const FALLBACK_MS = 15_000

async function refresh($: EngineInterface) {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const breakdown = usage.context.breakdown
  if (!breakdown) return

  const freshSnapshot = toSnapshot(breakdown)
  if (JSON.stringify(await read($, snapshot)) !== JSON.stringify(freshSnapshot)) {
    await update($, snapshot, () => freshSnapshot)
  }

  const freshDetails = toDetails(breakdown)
  if (JSON.stringify(await read($, details)) !== JSON.stringify(freshDetails)) {
    await update($, details, () => freshDetails)
  }
}

async function refreshIfShown($: EngineInterface) {
  try {
    if (await read($, isShown)) await refresh($)
  } catch {
    // No session bound yet (or between /clear and the next one): the next
    // trigger tries again.
  }
}

// Several triggers in a burst fold into one refresh. A reload starts it over.
let pending: Timer | undefined

function schedule($: EngineInterface, ms: number) {
  if (pending) return
  pending = $.clock.after(ms, () => {
    pending = undefined
    void refreshIfShown($)
  })
}

/**
 * Shows `name` (a category, or ALL) where the press came from: in the band
 * for a terminal, in a pane elsewhere. The one already shown hides instead.
 */
async function showDetail($: EngineInterface, name: string, surface: RenderSurface) {
  const current = await read($, selected)
  if (current === name) {
    await closeDetail($)
    return
  }
  const place = surface === 'terminal' ? 'band' : 'pane'
  // Moving from a pane to the band: close the pane first (its close clears `selected`).
  if (current !== null && place === 'band' && (await read($, detailPlace)) === 'pane') await $.ui.close({ id: PANE })
  await update($, detailPlace, () => place)
  await update($, selected, () => name)
  if (place === 'pane') {
    const snap = await read($, snapshot)
    await $.ui.open({ id: PANE, title: titleFor(name, snap?.categories ?? []), closeOnEscape: true })
  }
}

async function closeDetail($: EngineInterface) {
  const place = await read($, detailPlace)
  await update($, selected, () => null)
  if (place === 'pane') await $.ui.close({ id: PANE })
}

/** Picks the detail's language, or Auto; remembered across sessions. */
async function setLanguageMode($: EngineInterface, mode: ContextBarLanguageMode) {
  await update($, languageMode, () => mode)
  await $.store.set(LANGUAGE_MODE_KEY, mode)
}

function modeName(mode: ContextBarLanguageMode): string {
  return mode === 'auto' ? 'Auto (follows the language you write in)' : PACKS[mode].name
}

/**
 * What `selected` holds, `width` cells wide: in the band (with a × to hide it)
 * or in the pane. Called while a render hook draws, so its reads subscribe it.
 */
async function detailBlock($: EngineInterface, e: ResolveInput, width: number, isInBand: boolean) {
  const { Box, Button, Text } = $.ui.resolve(e)
  const name = await read($, selected)
  const snap = await read($, snapshot)
  const mode = await read($, languageMode)
  const lang = effectiveLanguage(mode, await read($, language))
  if (name === null || snap === null) return <Text dimColor>{TEXT[lang].noFigures}</Text>

  const view = detailView({
    selected: name,
    snapshot: snap,
    details: await read($, details),
    toolSizes: await read($, toolSizes),
    width,
    language: lang,
  })

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color={view.color}>{'█ '}</Text>
        <Text bold>{view.title}</Text>
        <Text dimColor>{'  ' + view.headline}</Text>
        {isInBand && [<Text>{'   '}</Text>, <Button key="close" label="×" plain dimColor onPress={() => closeDetail($)} />]}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {view.rows.map(row => {
          const target = row.opens
          const about = row.about
          const label =
            target === undefined ? (
              <Text>{row.label}</Text>
            ) : (
              <Button key={'open:' + target} label={row.label} plain onPress={p => showDetail($, target, p.surface)} />
            )
          return [
            <Box flexDirection="row">
              <Text color={row.color}>{row.bar}</Text>
              <Text>{row.tokens}</Text>
              <Text>{'  '}</Text>
              {about !== undefined && view.aboutPlacement === 'inline' ? (
                <Box width={view.nameWidth} flexShrink={0}>
                  {label}
                </Box>
              ) : (
                label
              )}
              {about !== undefined && view.aboutPlacement === 'inline' && <Text dimColor>{'  ' + about}</Text>}
            </Box>,
            about !== undefined && view.aboutPlacement === 'below' && (
              <Box marginLeft={view.labelColumn}>
                <Text dimColor>{about}</Text>
              </Box>
            ),
          ]
        })}
        {view.hidden > 0 && <Text dimColor>{TEXT[lang].more(view.hidden)}</Text>}
      </Box>
      {view.notes.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {view.notes.map(note => (
            <Text dimColor>{note}</Text>
          ))}
        </Box>
      )}
      {name !== ALL && (
        <Box marginTop={1}>
          <Button key="all" label={TEXT[lang].back} plain dimColor onPress={p => showDetail($, ALL, p.surface)} />
        </Box>
      )}
      <Box key="languages" flexDirection="row" flexWrap="wrap" marginTop={1}>
        <Text dimColor>{TEXT[lang].language + ':'}</Text>
        {MODES.map(choice => {
          const isPicked = choice === mode
          const label = (isPicked ? '● ' : '') + (choice === 'auto' ? TEXT[lang].auto : PACKS[choice].name)
          return [
            <Text>{'  '}</Text>,
            <Button
              key={'lang:' + choice}
              label={label}
              plain
              dimColor={!isPicked}
              onPress={() => setLanguageMode($, choice)}
            />,
          ]
        })}
      </Box>
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Toggle the context-window bar above the prompt',
      argumentHint: '[on|off|lang <auto|en|zh|ja|ko|fr|es|de|pt>]',
      immediate: true,
    })
    const stored = await $.store.get(STORE_KEY)
    if (typeof stored === 'boolean') await update($, isShown, () => stored)
    const keptLanguage = await $.store.get(LANGUAGE_KEY)
    const storedLanguage = LANGUAGES.find(code => code === keptLanguage)
    if (storedLanguage !== undefined) await update($, language, () => storedLanguage)
    const storedMode = await $.store.get(LANGUAGE_MODE_KEY)
    const mode = MODES.find(m => m === storedMode)
    if (mode !== undefined) await update($, languageMode, () => mode)
    // Loaded after the tools were described (a reload into a running session),
    // or what was kept predates the summaries: have the engine describe them
    // again on the next request. The answers do not change, so the prompt and
    // its cache stay as they were.
    const sizes = Object.values(await read($, toolSizes))
    if (sizes.length === 0 || sizes.some(size => size.summary === undefined)) $.ui.invalidate('tool.describe')
    await refreshIfShown($)
    $.clock.every(FALLBACK_MS, () => void refreshIfShown($))

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const [verb, word] = arg.split(/\s+/)
    if (verb === 'lang' || verb === 'language') {
      const choices = 'auto, ' + LANGUAGES.join(', ')
      if (word === undefined || word === '') {
        return { text: 'Context bar language: ' + modeName(await read($, languageMode)) + '. Choose with /context-bar lang <' + choices + '>.' }
      }
      const mode = parseLanguageMode(word)
      if (mode === undefined) return { text: 'Unknown language "' + word + '". Choose one of: ' + choices + '.' }
      await setLanguageMode($, mode)
      return { text: 'Context bar language: ' + modeName(mode) + '.' }
    }
    const current = await read($, isShown)
    const want = arg === '' ? !current : arg === 'on' ? true : arg === 'off' ? false : null
    if (want === null) return { text: 'Usage: /context-bar [on|off|lang <code>]' }

    await update($, isShown, () => want)
    await $.store.set(STORE_KEY, want)
    if (want) await refreshIfShown($)
    else if ((await read($, selected)) !== null) await closeDetail($)

    return { text: want ? 'Context bar on.' : 'Context bar off.' }
  })

  // Under Auto the detail follows the language of the person's prompts; one
  // too short to tell (`ok`, `/context-bar`) keeps the last. A picked language
  // leaves the prompts unread. Read, never changed.
  on('prompt.submit', async ($, e, next) => {
    const isAuto = (await read($, languageMode)) === 'auto'
    const said = isAuto && PERSON.has(e.origin.kind) ? detectLanguage(e.text) : undefined
    if (said !== undefined && said !== (await read($, language))) {
      try {
        await update($, language, () => said)
        await $.store.set(LANGUAGE_KEY, said)
      } catch {
        // The detail keeps its language; the prompt goes on either way.
      }
    }
    return next(e)
  })

  // The one place the whole description of a built-in tool shows: `$.tool.list()`
  // cuts each to 300 characters. Watched, never changed.
  on('tool.describe', async ($, e, next) => {
    const result = await next(e)
    if (!e.tool.startsWith('mcp__')) {
      const size = {
        chars: result.description.length,
        isDeferred: (result.isDeferred ?? e.isDeferred) === true,
        summary: firstSentence(result.description),
      }
      try {
        await update($, toolSizes, sizes => ({ ...sizes, [e.tool]: size }))
      } catch {
        // A size missed is a row missing from the detail; the description stands.
      }
    }
    return result
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    const result = await next(e)
    await update($, selected, () => null)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    if (e.changed.includes('context')) schedule($, 0)
    return result
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) schedule($, TOOL_REFRESH_MS)
    return result
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (e.trigger !== 'precompute') schedule($, 0)
    return result
  })

  on('session.end', ($, e, next) => {
    if (e.reason === 'clear') schedule($, 500)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isShown))) return next(e)
    const snap = await read($, snapshot)
    if (!snap) return next(e)

    const width = Math.max(1, e.props.bodyColumns)
    const segments = allocate(snap.categories, width)
    if (segments.length === 0) return next(e)
    const line = legend(snap, width)
    const isDetailHere =
      e.surface === 'terminal' && (await read($, selected)) !== null && (await read($, detailPlace)) === 'band'
    // The frame and its padding take 4 cells of the band's width.
    const detail = isDetailHere ? await detailBlock($, e, Math.max(20, width - 4), true) : null
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box key="bar" flexDirection="row">
          {segments.map(s => (
            <Text color={s.color}>{glyphFor(s.kind).repeat(s.cells)}</Text>
          ))}
        </Box>
        <Box key="legend" flexDirection="row" flexWrap="wrap">
          <Button key="summary" label={line.summary} plain dimColor onPress={p => showDetail($, ALL, p.surface)} />
          {line.items.map(item => [
            <Text>{'  '}</Text>,
            <Text color={item.color}>{item.glyph}</Text>,
            <Text>{' '}</Text>,
            <Button
              key={'cat:' + item.name}
              label={item.label}
              plain
              dimColor
              onPress={p => showDetail($, item.name, p.surface)}
            />,
          ])}
          {line.hidden > 0 && [
            <Text>{' '}</Text>,
            <Button key="more" label={'+' + line.hidden} plain dimColor onPress={p => showDetail($, ALL, p.surface)} />,
          ]}
        </Box>
        {detail !== null && (
          <Box key="detail" flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
            {detail}
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) =>
    detailBlock($, e, e.props.bodyColumns, false),
  )
}
