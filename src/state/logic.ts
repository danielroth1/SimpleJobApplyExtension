import { AppState, Paragraph, KeywordWithOptions } from './types'

export function hslForIndex(idx: number, darkMode: boolean = false): string {
  const hue = (idx * 47) % 360
  if (darkMode) {
    // Darker colors with better contrast for dark mode
    return `hsl(${hue} 70% 35%)`
  }
  return `hsl(${hue} 80% 85%)`
}

// Return opaque version of color for preview (removes alpha/transparency)
export function opaqueColorForIndex(idx: number, darkMode: boolean = false): string {
  const hue = (idx * 47) % 360
  if (darkMode) {
    return `hsl(${hue} 80% 50%)`
  }
  return `hsl(${hue} 90% 60%)`
}

// Get gray color for empty paragraphs
export function grayColor(darkMode: boolean = false): string {
  return darkMode ? 'hsl(0 0% 30%)' : 'hsl(0 0% 85%)'
}

// Find next available color index that's not already used
export function getNextAvailableColorIndex(paragraphs: Paragraph[], darkMode: boolean): number {
  const usedColors = new Set<string>()
  // Consider explicitly set colors
  paragraphs.forEach(p => {
    if (p.color) usedColors.add(p.color)
  })
  // Also consider implicit auto-assigned palette colors used in UI for paragraphs
  // that have keywords but no explicit color, based on their index position
  paragraphs.forEach((p, i) => {
    if (!p.color && p.keywords && p.keywords.length > 0) {
      usedColors.add(hslForIndex(i, darkMode))
    }
  })

  // Try up to 12 colors in palette
  for (let i = 0; i < 12; i++) {
    const color = hslForIndex(i, darkMode)
    if (!usedColors.has(color)) return i
  }
  
  // If all used, return next index
  return paragraphs.length
}

// Check if a keyword matches at a specific position in text
export function isKeywordMatch(
  text: string, 
  keyword: KeywordWithOptions, 
  position: number
): boolean {
  const kwTrim = keyword.text.trim()
  if (!kwTrim) return false
  
  const searchText = keyword.matchCase ? text : text.toLowerCase()
  const searchKeyword = keyword.matchCase ? kwTrim : kwTrim.toLowerCase()
  
  // Check if the keyword is at this position
  if (searchText.substr(position, searchKeyword.length) !== searchKeyword) {
    return false
  }
  
  // Check whole word match if required
  if (keyword.matchWholeWord) {
    const before = position > 0 ? text[position - 1] : ' '
    const after = position + kwTrim.length < text.length ? text[position + kwTrim.length] : ' '
    const isWordBoundary = (c: string) => /[\s\W]/.test(c)
    
    if (!isWordBoundary(before) || !isWordBoundary(after)) {
      return false
    }
  }
  
  return true
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

  paragraphs.forEach((p, paraColorIdx) => {
    const set = new Set<string>()
    p.keywords.forEach(kw => {
      const kwTrim = kw.text.trim()
      if (!kwTrim) return
      
      const searchText = kw.matchCase ? raw : raw.toLowerCase()
      const searchKeyword = kw.matchCase ? kwTrim : kwTrim.toLowerCase()
      
      // Find all occurrences
      let from = 0
      while (true) {
        const idx = searchText.indexOf(searchKeyword, from)
        if (idx === -1) break
        
        // Use the extracted matching logic
        if (isKeywordMatch(raw, kw, idx)) {
          matches.push({ start: idx, end: idx + kwTrim.length, colorIdx: paraColorIdx, keyword: kwTrim })
          set.add(kwTrim)
        }
        
        from = idx + 1
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
  // Resolve color from paragraph (stable if user changed)
  const para = paragraphs[m.colorIdx]
  const color = (para?.color) ? para.color : hslForIndex(m.colorIdx, darkMode)
    const inner = escapeHtml(raw.slice(m.start, m.end))
    out += `<span style="background:${color}">${inner}</span>`
    cursor = m.end
  }
  out += escapeHtml(raw.slice(cursor))
  html = out

  return { html, matched }
}

export function generateCoverLetterHTML(paragraphs: Paragraph[], highlightEnabled: boolean = false, darkMode: boolean = false, recruiterName?: string): string {
  // Helper: strip trailing empty <p></p> or <p><br></p> tags
  const stripTrailingEmptyPs = (html: string): string => {
    return html.replace(/(?:\s*<p[^>]*>(?:\s*|<br\s*\/?>)*<\/p>\s*)+$/gi, '')
  }

  // Helper: extract all <p> blocks from HTML, preserving attributes
  const extractPBlocks = (html: string): Array<{ attrs: string, inner: string }> => {
    const blocks: Array<{ attrs: string, inner: string }> = []
    const pRegex = /<p([^>]*)>([\s\S]*?)<\/p>/gi
    let match: RegExpExecArray | null
    
    while ((match = pRegex.exec(html)) !== null) {
      const attrs = match[1] ?? ''
      const inner = match[2] ?? ''
      // Skip empty paragraphs (only whitespace or <br>)
      if (inner.trim() && inner.trim() !== '<br>' && inner.trim() !== '<br/>') {
        blocks.push({ attrs, inner })
      }
    }
    
    return blocks
  }

  // Helper: wrap content with highlighting if needed
  const wrapHighlight = (content: string, paraIdx: number, hasKeywords: boolean): string => {
    if (!highlightEnabled || !hasKeywords) return content
    const p = paragraphs[paraIdx]
    const color = (p?.color) ? p.color : hslForIndex(paraIdx, darkMode)
    return `<span style="background:${color}">${content}</span>`
  }

  // Only include paragraphs marked included/autoInclude; keep original index for color selection
  const included = paragraphs.map((p, idx) => ({ p, idx })).filter(x => x.p.included || x.p.autoInclude)
  const outputBlocks: string[] = []

  // Walk through included paragraphs, merging runs where noLineBreak is set
  for (let i = 0; i < included.length; i++) {
    const start = included[i]
    const cleanStartHtml = stripTrailingEmptyPs(start.p.html || '')
    
    // Extract all <p> blocks from this paragraph's HTML
    const startBlocks = extractPBlocks(cleanStartHtml)
    
    // If no <p> blocks found, treat entire content as single block
    if (startBlocks.length === 0) {
      const content = cleanStartHtml.trim()
      if (!content && (start.p.keywords?.length ?? 0) === 0) {
        // Empty paragraph with no keywords: show placeholder
        outputBlocks.push('<p style="color: var(--muted); font-style: italic;">[No keywords - add keywords to this paragraph]</p>')
        continue
      }
      if (content) {
        let combinedContent = wrapHighlight(content, start.idx, (start.p.keywords?.length ?? 0) > 0)
        
        // If noLineBreak is set, merge with next paragraphs
        if (start.p.noLineBreak && i + 1 < included.length) {
          let currentIdx = i
          while (currentIdx + 1 < included.length) {
            const next = included[currentIdx + 1]
            const cleanNextHtml = stripTrailingEmptyPs(next.p.html || '')
            const nextBlocks = extractPBlocks(cleanNextHtml)
            
            // Add space before merged content
            combinedContent += ' '
            
            // If no blocks, use raw content
            if (nextBlocks.length === 0) {
              const nextContent = cleanNextHtml.trim()
              if (nextContent) {
                const nextHighlighted = wrapHighlight(nextContent, next.idx, (next.p.keywords?.length ?? 0) > 0)
                combinedContent += nextHighlighted
              }
            } else {
              // Add all blocks from next paragraph
              for (const nextBlock of nextBlocks) {
                const nextHighlighted = wrapHighlight(nextBlock.inner, next.idx, (next.p.keywords?.length ?? 0) > 0)
                combinedContent += nextHighlighted
              }
            }
            
            // Move to next paragraph
            currentIdx++
            i = currentIdx
            
            // Stop if the next paragraph doesn't have noLineBreak
            if (!next.p.noLineBreak) break
          }
        }
        
        outputBlocks.push(`<p>${combinedContent}</p>`)
      }
      continue
    }

    // Process each <p> block
    for (let blockIdx = 0; blockIdx < startBlocks.length; blockIdx++) {
      const block = startBlocks[blockIdx]
      let combinedInner = wrapHighlight(block.inner, start.idx, (start.p.keywords?.length ?? 0) > 0)

      // If noLineBreak is set and this is the LAST block of this paragraph, merge with next paragraph
      const isLastBlock = blockIdx === startBlocks.length - 1
      if (isLastBlock && start.p.noLineBreak && i + 1 < included.length) {
        // Collect content from following paragraphs while they also have noLineBreak set
        let currentIdx = i
        while (currentIdx + 1 < included.length) {
          const next = included[currentIdx + 1]
          const cleanNextHtml = stripTrailingEmptyPs(next.p.html || '')
          const nextBlocks = extractPBlocks(cleanNextHtml)
          
          // Add space before merged content
          combinedInner += ' '
          
          // If no blocks, use raw content
          if (nextBlocks.length === 0) {
            const nextContent = cleanNextHtml.trim()
            if (nextContent) {
              const nextHighlighted = wrapHighlight(nextContent, next.idx, (next.p.keywords?.length ?? 0) > 0)
              combinedInner += nextHighlighted
            }
          } else {
            // Add all blocks from next paragraph
            for (const nextBlock of nextBlocks) {
              const nextHighlighted = wrapHighlight(nextBlock.inner, next.idx, (next.p.keywords?.length ?? 0) > 0)
              combinedInner += nextHighlighted
            }
          }
          
          // Move to next paragraph
          currentIdx++
          i = currentIdx
          
          // Stop if the next paragraph doesn't have noLineBreak
          if (!next.p.noLineBreak) break
        }
      }

      // Output the combined block
      outputBlocks.push(`<p${block.attrs}>${combinedInner}</p>`)
    }
  }

  let result = outputBlocks.join('')
  
  // Replace <recruiter> tag with actual recruiter name if provided
  if (recruiterName) {
    result = result.replace(/<recruiter>/gi, recruiterName)
  }
  
  return result
}

// Clone state while preserving Operation class instances in undo/redo stacks
export function cloneState<T>(obj: T): T {
  if (obj && typeof obj === 'object' && 'undoStack' in obj && 'redoStack' in obj) {
    // This is an AppState object - preserve the operation stacks
    const state = obj as any
    const { undoStack, redoStack, ...rest } = state
    const cloned = JSON.parse(JSON.stringify(rest))
    // Preserve the original operation arrays (don't clone them)
    cloned.undoStack = undoStack
    cloned.redoStack = redoStack
    return cloned as T
  }
  return JSON.parse(JSON.stringify(obj))
}
