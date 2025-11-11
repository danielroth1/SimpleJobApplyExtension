import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Paragraph } from '@/state/types'
import { useAppState } from '@/state/AppStateContext'
import { hslForIndex, opaqueColorForIndex, grayColor } from '@/state/logic'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KeywordContextMenu from './KeywordContextMenu'
import RichTextEditor from './RichTextEditor'

export default function ParagraphItem({ paragraph, colorIndex }: { paragraph: Paragraph, colorIndex: number }) {
  const { actions, state } = useAppState()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [showKeywordInput, setShowKeywordInput] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ keyword: string; x: number; y: number } | null>(null)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const [draggedKeywordIndex, setDraggedKeywordIndex] = useState<number | null>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const deletePopupRef = useRef<HTMLDivElement>(null)
  
  // Use paragraph color, or gray if no keywords and no color, or fallback to palette
  const color = useMemo(() => {
    if (paragraph.color) return paragraph.color
    if (paragraph.keywords.length === 0) return grayColor(state.darkMode)
    return hslForIndex(colorIndex, state.darkMode)
  }, [paragraph.color, paragraph.keywords.length, colorIndex, state.darkMode])

  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  
  // Close delete popup when clicking outside
  useEffect(() => {
    if (!showDeleteConfirm) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        deletePopupRef.current && 
        !deletePopupRef.current.contains(event.target as Node) &&
        deleteButtonRef.current &&
        !deleteButtonRef.current.contains(event.target as Node)
      ) {
        setShowDeleteConfirm(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDeleteConfirm])

  // Close color menu on outside click
  useEffect(() => {
    if (!showColorMenu) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorMenuRef.current && 
        !colorMenuRef.current.contains(event.target as Node) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(event.target as Node)
      ) {
        setShowColorMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorMenu])

  // Determine if this paragraph has any matched keywords
  const hasMatchedKeywords = useMemo(() => 
    paragraph.lastMatchedKeywords && paragraph.lastMatchedKeywords.length > 0,
    [paragraph.lastMatchedKeywords]
  )
  
  // Create a lighter background color for highlighted paragraphs
  const backgroundColor = useMemo(() => {
    if (!hasMatchedKeywords) return undefined
    // Extract HSL values from the color string (supports both "hsl(240, 70%, 60%)" and "hsl(240 70% 60%)")
    const match = color.match(/hsl\((\d+)[,\s]+(\d+)%[,\s]+(\d+)%\)/)
    if (!match) return undefined
    const [, h, s, l] = match
    // Make it much lighter and less saturated for background
    return `hsl(${h}, ${state.darkMode ? Math.min(parseInt(s) * 0.6, 60) : Math.min(parseInt(s) * 1.0, 100)}%, ${state.darkMode ? 20 : 95}%)`
  }, [hasMatchedKeywords, color, state.darkMode])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: paragraph.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor,
    opacity: isDragging ? 0.5 : 1,
    scale: isDragging ? '1' : undefined, // Prevent scaling
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`paragraph-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="paragraph-sidebar">
        <button className="drag-handle-btn" {...attributes} {...listeners} title="Drag to reorder">⠿</button>
        <button 
          className="toggle" 
          title={paragraph.collapsed ? "Expand paragraph" : "Collapse paragraph"} 
          onClick={() => actions.updateParagraph(paragraph.id, { collapsed: !paragraph.collapsed })}
        >
          {paragraph.collapsed ? '▶' : '▼'}
        </button>
        {!paragraph.collapsed && (
          <>
            <button
              ref={colorButtonRef}
              className={`toggle ${paragraph.userPickedColor ? 'active' : ''}`}
              title={paragraph.userPickedColor ? `Change color` : 'Assign color'}
              onClick={() => setShowColorMenu(v => !v)}
            >🎨</button>
            <button className={`toggle ${paragraph.included ? 'active' : ''}`} title="Included in cover letter" onClick={() => actions.updateParagraph(paragraph.id, { included: !paragraph.included })}>✓</button>
            <button className={`toggle ${paragraph.autoInclude ? 'active' : ''}`} title="Always include in cover letter" onClick={() => actions.updateParagraph(paragraph.id, { autoInclude: !paragraph.autoInclude })}>★</button>
            <button className={`toggle no-break ${paragraph.noLineBreak ? 'active' : ''}`} title="Merge with paragraph below" onClick={() => actions.updateParagraph(paragraph.id, { noLineBreak: !paragraph.noLineBreak })}>⏎</button>
            <button ref={deleteButtonRef} className="toggle delete-btn" title="Delete paragraph" onClick={() => setShowDeleteConfirm(true)}>🗑</button>
          </>
        )}
      </div>
      <div className="paragraph-main">
        {/* Top bar keywords */}
        <div 
          className="keywords" 
          style={{ borderColor: color }}
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => {
            e.preventDefault()
            setDraggedKeywordIndex(null)
            const data = e.dataTransfer?.getData('application/json')
            if (!data) return
            try {
              const payload = JSON.parse(data) as { fromParagraphId: string, fromIndex: number, keyword: string }
              if (!payload) return
              if (payload.fromParagraphId !== paragraph.id) {
                actions.transferKeyword(payload.fromParagraphId, payload.fromIndex, paragraph.id)
                setTimeout(() => actions.analyzeNow(), 50)
              }
            } catch {}
          }}
        >
          {paragraph.keywords.map((kw, idx) => {
            const matched = paragraph.lastMatchedKeywords?.includes(kw.text)
            const isDragging = draggedKeywordIndex === idx
            return (
              <span 
                key={kw.text} 
                className="chip" 
                style={{
                  background: matched ? color : undefined,
                  opacity: isDragging ? 0.4 : 1,
                  cursor: 'grab'
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ keyword: kw.text, x: e.clientX, y: e.clientY })
                }}
                title={`Right-click for options${kw.matchWholeWord ? ' • Whole word' : ''}${kw.matchCase ? ' • Match case' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDraggedKeywordIndex(idx)
                  e.dataTransfer?.setData('application/json', JSON.stringify({ fromParagraphId: paragraph.id, fromIndex: idx, keyword: kw.text }))
                  // Create a custom drag preview
                  const dragPreview = document.createElement('div')
                  dragPreview.textContent = kw.text
                  dragPreview.style.cssText = `
                    position: absolute;
                    top: -1000px;
                    padding: 4px 10px;
                    background: ${matched ? color : 'var(--chip-bg)'};
                    color: var(--text);
                    border-radius: 12px;
                    font-size: 12px;
                    border: 1px solid var(--border);
                    opacity: 0.9;
                  `
                  document.body.appendChild(dragPreview)
                  e.dataTransfer?.setDragImage(dragPreview, 10, 10)
                  setTimeout(() => document.body.removeChild(dragPreview), 0)
                }}
                onDragEnd={() => setDraggedKeywordIndex(null)}
                onDragOver={(e) => { e.preventDefault() }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDraggedKeywordIndex(null)
                  const data = e.dataTransfer?.getData('application/json')
                  if (!data) return
                  try {
                    const payload = JSON.parse(data) as { fromParagraphId: string, fromIndex: number, keyword: string }
                    if (!payload) return
                    if (payload.fromParagraphId === paragraph.id) {
                      if (payload.fromIndex !== idx) actions.moveKeyword(paragraph.id, payload.fromIndex, idx)
                    } else {
                      actions.transferKeyword(payload.fromParagraphId, payload.fromIndex, paragraph.id, idx)
                    }
                    setTimeout(() => actions.analyzeNow(), 50)
                  } catch {}
                }}
              >
                <span>{kw.text}</span>
                <span className="x" onClick={() => {
                  actions.removeKeyword(paragraph.id, kw.text)
                  // Re-analyze after removing keyword
                  setTimeout(() => actions.analyzeNow(), 50)
                }}>×</span>
              </span>
            )
          })}
          {paragraph.keywords.length === 0 && !showKeywordInput && (
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Click to add keywords...</span>
          )}
          {showKeywordInput ? (
            <input
              type="text"
              autoFocus
              value={keywordInput}
              placeholder="e.g. React, TypeScript"
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const parts = keywordInput.split(',').map(s => s.trim()).filter(Boolean)
                  parts.forEach(k => actions.addKeyword(paragraph.id, k))
                  setKeywordInput('')
                  setShowKeywordInput(false)
                  // Re-analyze after adding keywords
                  setTimeout(() => actions.analyzeNow(), 50)
                } else if (e.key === 'Escape') {
                  setKeywordInput('')
                  setShowKeywordInput(false)
                }
              }}
              onBlur={() => {
                if (keywordInput.trim()) {
                  const parts = keywordInput.split(',').map(s => s.trim()).filter(Boolean)
                  parts.forEach(k => actions.addKeyword(paragraph.id, k))
                  // Re-analyze after adding keywords
                  setTimeout(() => actions.analyzeNow(), 50)
                }
                setKeywordInput('')
                setShowKeywordInput(false)
              }}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                outline: 'none',
                minWidth: '150px',
              }}
            />
          ) : (
            <button
              onClick={() => setShowKeywordInput(true)}
              style={{
                border: '1px dashed var(--border)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '12px',
                background: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              + Add
            </button>
          )}
        </div>
        {/* Rich text editor - hidden when collapsed */}
        {!paragraph.collapsed && (
          <RichTextEditor 
            content={paragraph.html}
            onChange={(html) => actions.updateParagraph(paragraph.id, { html })}
            showToolbar={true}
          />
        )}
        {showColorMenu && colorButtonRef.current && (
          <div
            ref={colorMenuRef}
            style={{
              position: 'fixed',
              top: colorButtonRef.current.getBoundingClientRect().top,
              left: colorButtonRef.current.getBoundingClientRect().right + 8,
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Paragraph color</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 20px)', gap: 6 }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const c = opaqueColorForIndex(i, state.darkMode)
                const actualColor = hslForIndex(i, state.darkMode)
                return (
                  <button
                    key={i}
                    onClick={() => { 
                      actions.setParagraphColor(paragraph.id, actualColor, true); 
                      setShowColorMenu(false); 
                      setTimeout(() => { actions.analyzeNow(); actions.generateCoverLetter(); }, 50) 
                    }}
                    title={actualColor}
                    style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: c, cursor: 'pointer' }}
                  />
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text)' }}>Custom</label>
              <input type="color" value={toHexColor(color)} onChange={(e) => { 
                actions.setParagraphColor(paragraph.id, e.target.value, true); 
                setTimeout(() => { actions.analyzeNow(); actions.generateCoverLetter(); }, 50) 
              }} />
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { 
                actions.setParagraphColor(paragraph.id, undefined, true); 
                setShowColorMenu(false); 
                setTimeout(() => { actions.analyzeNow(); actions.generateCoverLetter(); }, 50) 
              }}>Auto</button>
            </div>
          </div>
        )}
        {showDeleteConfirm && deleteButtonRef.current && (
          <div 
            ref={deletePopupRef}
            style={{
              position: 'fixed',
              top: deleteButtonRef.current.getBoundingClientRect().top,
              left: deleteButtonRef.current.getBoundingClientRect().right + 8,
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '200px',
              maxWidth: '280px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>Delete Paragraph?</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  actions.deleteParagraph(paragraph.id)
                  setShowDeleteConfirm(false)
                }}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  border: '1px solid #ef4444',
                  borderRadius: '4px',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
        
        {contextMenu && (
          <KeywordContextMenu
            keyword={paragraph.keywords.find(k => k.text === contextMenu.keyword)!}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu(null)}
            onUpdate={(updates) => {
              actions.updateKeyword(paragraph.id, contextMenu.keyword, updates)
              // Re-analyze after updating keyword options
              setTimeout(() => actions.analyzeNow(), 50)
            }}
            onDelete={() => {
              actions.removeKeyword(paragraph.id, contextMenu.keyword)
              // Re-analyze after deleting keyword
              setTimeout(() => actions.analyzeNow(), 50)
            }}
            color={color}
          />
        )}
      </div>
    </div>
  )
}

// Utility: Convert any CSS color to hex for <input type="color">; basic support for hsl() from palette
function toHexColor(input: string): string {
  try {
    // If already hex
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input)) return input
    // Try to parse hsl(h s% l%)
    const m = input.match(/hsl\((\d+)[,\s]+(\d+)%[,\s]+(\d+)%\)/i)
    if (m) {
      const h = parseInt(m[1], 10), s = parseInt(m[2], 10) / 100, l = parseInt(m[3], 10) / 100
      const c = (1 - Math.abs(2 * l - 1)) * s
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
      const m0 = l - c / 2
      let r = 0, g = 0, b = 0
      if (0 <= h && h < 60) { r = c; g = x; b = 0 } else if (60 <= h && h < 120) { r = x; g = c; b = 0 } else if (120 <= h && h < 180) { r = 0; g = c; b = x } else if (180 <= h && h < 240) { r = 0; g = x; b = c } else if (240 <= h && h < 300) { r = x; g = 0; b = c } else { r = c; g = 0; b = x }
      const R = Math.round((r + m0) * 255), G = Math.round((g + m0) * 255), B = Math.round((b + m0) * 255)
      const toHex = (n: number) => n.toString(16).padStart(2, '0')
      return `#${toHex(R)}${toHex(G)}${toHex(B)}`
    }
  } catch {}
  // Fallback
  return '#cccccc'
}
