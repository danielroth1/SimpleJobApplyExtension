import { AppState, Paragraph } from './types'

export function hslForIndex(idx: number, darkMode: boolean = false): string {
  const hue = (idx * 47) % 360
  if (darkMode) {
    // Darker colors with better contrast for dark mode
    return `hsl(${hue} 70% 35%)`
  }
  return `hsl(${hue} 80% 85%)`
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"]|\u00A0/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case '\u00A0': return '&nbsp;'
      default: return c
    }
  })
}

export function highlightJobPosting(raw: string, paragraphs: Paragraph[], darkMode: boolean = false): { html: string, matched: Map<string, Set<string>> } {
  const escaped = escapeHtml(raw)
  // Build a combined regex map by group
  let html = escaped
  const matched = new Map<string, Set<string>>()

  // We'll annotate by wrapping matches in span with data-group
  // To avoid replacing inside previously injected spans, process with indexes: naive but acceptable for MVP by replacing sequentially using placeholder markers.
  type Match = { start: number, end: number, colorIdx: number, keyword: string }
  const matches: Match[] = []

  const lower = raw.toLowerCase()
  paragraphs.forEach((p, paraColorIdx) => {
    const set = new Set<string>()
    p.keywords.forEach(kw => {
      const kwTrim = kw.trim()
      if (!kwTrim) return
      const kwLower = kwTrim.toLowerCase()
      // Find all occurrences (simple substring)
      let from = 0
      while (true) {
        const idx = lower.indexOf(kwLower, from)
        if (idx === -1) break
        matches.push({ start: idx, end: idx + kwLower.length, colorIdx: paraColorIdx, keyword: kwTrim })
        set.add(kwTrim)
        from = idx + kwLower.length
      }
    })
    if (set.size) matched.set(p.id, set)
  })

  // Merge overlapping matches preferring longer spans
  matches.sort((a,b)=> a.start - b.start || b.end - a.end)
  const merged: Match[] = []
  let lastEnd = -1
  for (const m of matches) {
    if (m.start >= lastEnd) {
      merged.push(m)
      lastEnd = m.end
    }
  }

  // Rebuild HTML with spans
  let out = ''
  let cursor = 0
  for (const m of merged) {
    out += escapeHtml(raw.slice(cursor, m.start))
    const color = hslForIndex(m.colorIdx, darkMode)
    const inner = escapeHtml(raw.slice(m.start, m.end))
    out += `<span style="background:${color}">${inner}</span>`
    cursor = m.end
  }
  out += escapeHtml(raw.slice(cursor))
  html = out

  return { html, matched }
}

export function generateCoverLetterHTML(paragraphs: Paragraph[]): string {
  // Iterate paragraphs; include autoInclude or included
  const parts: string[] = []
  paragraphs.forEach(p => {
    const include = p.included || p.autoInclude
    if (!include) return
    const content = p.html || ''
    if (p.noLineBreak && parts.length) {
      parts[parts.length - 1] = parts[parts.length - 1] + content
    } else {
      parts.push(content)
    }
  })
  // Join with a single blank line between blocks
  return parts.join('<br/><br/>')
}

export function cloneState<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) }
