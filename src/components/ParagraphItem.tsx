import React, { useMemo, useState } from 'react'
import { Paragraph } from '@/state/types'
import { useAppState } from '@/state/AppStateContext'
import { hslForIndex } from '@/state/logic'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function ParagraphItem({ paragraph, colorIndex }: { paragraph: Paragraph, colorIndex: number }) {
  const { actions, state } = useAppState()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [showKeywordInput, setShowKeywordInput] = useState(false)
  const color = useMemo(() => hslForIndex(colorIndex, state.darkMode), [colorIndex, state.darkMode])
  
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
            <button className={`toggle ${paragraph.noLineBreak ? 'active' : ''}`} title="No line break after this paragraph" onClick={() => actions.updateParagraph(paragraph.id, { noLineBreak: !paragraph.noLineBreak })}>↩</button>
            <button className="toggle delete-btn" title="Delete paragraph" onClick={() => setShowDeleteConfirm(true)}>🗑</button>
          </>
        )}
      </div>
      <div className="paragraph-main">
        {/* Top bar keywords */}
        <div className="keywords" style={{ borderColor: color }}>
          {paragraph.keywords.map(k => {
            const matched = paragraph.lastMatchedKeywords?.includes(k)
            return (
              <span key={k} className="chip" style={matched ? { background: color } : undefined}>
                <span>{k}</span>
                <span className="x" onClick={() => actions.removeKeyword(paragraph.id, k)}>×</span>
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
                } else if (e.key === 'Escape') {
                  setKeywordInput('')
                  setShowKeywordInput(false)
                }
              }}
              onBlur={() => {
                if (keywordInput.trim()) {
                  const parts = keywordInput.split(',').map(s => s.trim()).filter(Boolean)
                  parts.forEach(k => actions.addKeyword(paragraph.id, k))
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
          />
        )}
        {showDeleteConfirm && (
          <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h4>Delete Paragraph?</h4>
              <p>Are you sure you want to delete this paragraph? This action cannot be undone.</p>
              <div className="row">
                <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button onClick={() => {
                  actions.deleteParagraph(paragraph.id)
                  setShowDeleteConfirm(false)
                }} style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
