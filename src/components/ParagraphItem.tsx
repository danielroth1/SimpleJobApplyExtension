import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Paragraph } from '@/state/types'
import { useAppState } from '@/state/AppStateContext'
import { hslForIndex } from '@/state/logic'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KeywordContextMenu from './KeywordContextMenu'

export default function ParagraphItem({ paragraph, colorIndex }: { paragraph: Paragraph, colorIndex: number }) {
  const { actions, state } = useAppState()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [showKeywordInput, setShowKeywordInput] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ keyword: string; x: number; y: number } | null>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const deletePopupRef = useRef<HTMLDivElement>(null)
  const color = useMemo(() => hslForIndex(colorIndex, state.darkMode), [colorIndex, state.darkMode])
  
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
            <button className={`toggle ${paragraph.included ? 'active' : ''}`} title="Included in cover letter" onClick={() => actions.updateParagraph(paragraph.id, { included: !paragraph.included })}>✓</button>
            <button className={`toggle ${paragraph.autoInclude ? 'active' : ''}`} title="Always include in cover letter" onClick={() => actions.updateParagraph(paragraph.id, { autoInclude: !paragraph.autoInclude })}>★</button>
            <button className={`toggle no-break ${paragraph.noLineBreak ? 'active' : ''}`} title="Merge with paragraph below" onClick={() => actions.updateParagraph(paragraph.id, { noLineBreak: !paragraph.noLineBreak })}>⏎</button>
            <button ref={deleteButtonRef} className="toggle delete-btn" title="Delete paragraph" onClick={() => setShowDeleteConfirm(true)}>🗑</button>
          </>
        )}
      </div>
      <div className="paragraph-main">
        {/* Top bar keywords */}
        <div className="keywords" style={{ borderColor: color }}>
          {paragraph.keywords.map(kw => {
            const matched = paragraph.lastMatchedKeywords?.includes(kw.text)
            return (
              <span 
                key={kw.text} 
                className="chip" 
                style={matched ? { background: color } : undefined}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ keyword: kw.text, x: e.clientX, y: e.clientY })
                }}
                title={`Right-click for options${kw.matchWholeWord ? ' • Whole word' : ''}${kw.matchCase ? ' • Match case' : ''}`}
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
          <div
            className="rte"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: paragraph.html }}
            onBlur={(e) => {
              const newHtml = e.currentTarget.innerHTML
              if (newHtml !== paragraph.html) {
                actions.updateParagraph(paragraph.id, { html: newHtml })
              }
            }}
          />
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
