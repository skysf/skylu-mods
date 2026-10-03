// The languages the pane writes in, and which one the person writes in.
// Pure: no `$`, so the tests reach it directly.
//
// Each language is one file in lang/; adding one is that file, a line in
// PACKS, the code in ContextBarLanguage, and its words below for Auto.

import type { ContextBarLanguage, ContextBarLanguageMode } from '../types'
import { de } from './lang/de'
import { en } from './lang/en'
import { es } from './lang/es'
import { fr } from './lang/fr'
import { ja } from './lang/ja'
import { ko } from './lang/ko'
import { pt } from './lang/pt'
import type { LanguagePack, Strings } from './lang/strings'
import { zh } from './lang/zh'

export type { Strings }

export const PACKS: Readonly<Record<ContextBarLanguage, LanguagePack>> = { en, zh, ja, ko, fr, es, de, pt }

/** In the order the language buttons show them. */
export const LANGUAGES: readonly ContextBarLanguage[] = ['en', 'zh', 'ja', 'ko', 'fr', 'es', 'de', 'pt']

export const TEXT: Readonly<Record<ContextBarLanguage, Strings>> = {
  en: en.strings,
  zh: zh.strings,
  ja: ja.strings,
  ko: ko.strings,
  fr: fr.strings,
  es: es.strings,
  de: de.strings,
  pt: pt.strings,
}

/** The language the pane writes in: the one picked, or under Auto the one detected. */
export function effectiveLanguage(mode: ContextBarLanguageMode, detected: ContextBarLanguage): ContextBarLanguage {
  return mode === 'auto' ? detected : mode
}

const ALIASES: Readonly<Record<string, ContextBarLanguageMode>> = {
  auto: 'auto', automatic: 'auto', '自动': 'auto',
  en: 'en', english: 'en', '英文': 'en', '英语': 'en',
  zh: 'zh', cn: 'zh', chinese: 'zh', '中文': 'zh',
  ja: 'ja', jp: 'ja', japanese: 'ja', '日本語': 'ja', '日语': 'ja',
  ko: 'ko', kr: 'ko', korean: 'ko', '한국어': 'ko', '韩语': 'ko',
  fr: 'fr', french: 'fr', 'français': 'fr', francais: 'fr', '法语': 'fr',
  es: 'es', spanish: 'es', 'español': 'es', espanol: 'es', '西班牙语': 'es',
  de: 'de', german: 'de', deutsch: 'de', '德语': 'de',
  pt: 'pt', portuguese: 'pt', 'português': 'pt', portugues: 'pt', '葡萄牙语': 'pt',
}

/** `/context-bar lang <word>`: a code, a language's name in English or in itself. */
export function parseLanguageMode(word: string): ContextBarLanguageMode | undefined {
  return ALIASES[word.trim().toLowerCase()]
}

// Words that mark a Latin-script language, and letters only it uses. Short
// words that read the same in English (as, do, no, on) are left out.
const WORDS: Readonly<Record<'en' | 'fr' | 'es' | 'de' | 'pt', ReadonlySet<string>>> = {
  en: new Set(['the', 'and', 'is', 'are', 'to', 'of', 'in', 'it', 'this', 'that', 'with', 'for', 'you', 'can',
    'please', 'what', 'how', 'why', 'not', 'my', 'be', 'have', 'make', 'should', 'would', 'could', 'when', 'there']),
  fr: new Set(['le', 'la', 'les', 'des', 'et', 'est', 'une', 'pour', 'que', 'qui', 'pas', 'dans', 'sur', 'avec',
    'ce', 'cette', 'je', 'vous', 'tu', 'mon', 'du', 'au', 'aux', 'mais', 'ne', 'il', 'elle', 'plus', 'peux',
    'fais', 'merci', 'oui', 'très', 'comme', 'cela', 'ça', 'en']),
  es: new Set(['el', 'la', 'los', 'las', 'y', 'es', 'una', 'para', 'que', 'por', 'con', 'del', 'al', 'lo', 'mi',
    'este', 'esta', 'pero', 'cómo', 'qué', 'tengo', 'hay', 'más', 'puedes', 'gracias', 'sí', 'también', 'muy',
    'hacer', 'en', 'no']),
  de: new Set(['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'ich', 'zu', 'mit', 'den', 'dem', 'auf',
    'für', 'es', 'wie', 'was', 'bitte', 'kannst', 'du', 'mein', 'auch', 'oder', 'mach', 'danke', 'sehr', 'noch',
    'wird', 'sind']),
  pt: new Set(['os', 'um', 'uma', 'para', 'que', 'não', 'com', 'da', 'dos', 'das', 'em', 'na', 'por', 'mas', 'meu',
    'minha', 'você', 'isso', 'este', 'esta', 'pode', 'obrigado', 'também', 'muito', 'fazer', 'mais', 'é', 'e', 'o']),
}
const MARKS: Readonly<Record<'en' | 'fr' | 'es' | 'de' | 'pt', string>> = {
  en: '',
  fr: 'èùœîïë',
  es: 'ñ¿¡',
  de: 'ßäöü',
  pt: 'ãõ',
}

/**
 * The language of the person's own words in `text`, or undefined when there
 * is too little to tell (`ok`, `1`, a slash command), which keeps the last one.
 *
 * Japanese by its kana, Korean by Hangul, Chinese when Han characters carry
 * it (at least two, and no fewer than the Latin words around them:
 * `把 register.tsx 里的 schedule 挪到顶层` is Chinese). A Latin-script
 * language by its common words and letters, only when one clearly leads;
 * English also for three Latin words that no other language claims. Code,
 * links and paths are not words.
 */
export function detectLanguage(text: string): ContextBarLanguage | undefined {
  if (text.trimStart().startsWith('/')) return undefined
  const own = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(?:~|\.{1,2})?(?:\/[\w.@-]+)+/g, ' ')
  let han = 0
  let kana = 0
  let hangul = 0
  for (const ch of own) {
    const cp = ch.codePointAt(0) ?? 0
    if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)) han += 1
    else if (cp >= 0x3040 && cp <= 0x30ff) kana += 1
    else if ((cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x1100 && cp <= 0x11ff)) hangul += 1
  }
  const latinWords = (own.match(/[A-Za-z]{2,}/g) ?? []).length
  if (kana > 0 && kana + han >= 2) return 'ja'
  if (hangul >= 2) return 'ko'
  if (han >= 2 && han >= latinWords) return 'zh'
  if (han > 0 || kana > 0 || hangul > 0) return undefined

  const lower = own.toLowerCase()
  const words = lower.match(/[a-zà-öø-ÿœß]+/g) ?? []
  const scores = (Object.keys(WORDS) as (keyof typeof WORDS)[]).map(lang => {
    let score = words.filter(w => WORDS[lang].has(w)).length
    for (const mark of MARKS[lang]) if (lower.includes(mark)) score += 2
    return { lang, score }
  })
  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]
  const second = scores[1]
  if (best && second && best.score >= 3 && best.score - second.score >= 2) return best.lang
  if (latinWords >= 3 && scores.every(s => s.lang === 'en' || s.score === 0)) return 'en'
  return undefined
}
