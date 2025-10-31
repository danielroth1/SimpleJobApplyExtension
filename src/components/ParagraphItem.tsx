import React, { useMemo, useState } from 'react'
import { Paragraph } from '@/state/types'
import { useAppState } from '@/state/AppStateContext'
import { hslForIndex } from '@/state/logic'
import ModalPrompt from './ModalPrompt'
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'

export default function ParagraphItem({ paragraph, colorIndex, dragHandleProps }: { paragraph: Paragraph, colorIndex: number, dragHandleProps?: DraggableProvidedDragHandleProps | null }) {
  const { actions, state } = useAppState()
  const [showPrompt, setShowPrompt] = useState(false)
  const color = useMemo(() => hslForIndex(colorIndex, state.darkMode), [colorIndex, state.darkMode])

  return (
    <div className="paragraph-item">
      <div className="paragraph-sidebar">
        <button className="drag-handle-btn" {...dragHandleProps} title="Drag to reorder">⠿</button>
        <button className={`toggle ${paragraph.included ? 'active' : ''}`} title="Included in cover letter" onClick={() => actions.updateParagraph(paragraph.id, { included: !paragraph.included })}>✓</button>
        <button className={`toggle ${paragraph.autoInclude ? 'active' : ''}`} title="Always include in cover letter" onClick={() => actions.updateParagraph(paragraph.id, { autoInclude: !paragraph.autoInclude })}>★</button>
        <button className={`toggle ${paragraph.noLineBreak ? 'active' : ''}`} title="No line break after this paragraph" onClick={() => actions.updateParagraph(paragraph.id, { noLineBreak: !paragraph.noLineBreak })}>↩</button>
      </div>
      <div className="paragraph-main">
        {/* Top bar keywords */}
        <div className="keywords" style={{ borderColor: color }} onClick={(e)=> {
          // Only open prompt if clicked outside of a chip
          if ((e.target as HTMLElement).closest('.chip')) return
          setShowPrompt(true)
        }}>
          {paragraph.keywords.map(k => {
            const matched = paragraph.lastMatchedKeywords?.includes(k)
            return (
              <span key={k} className="chip" style={matched ? { background: color } : undefined}>
                <span>{k}</span>
                <span className="x" onClick={() => actions.removeKeyword(paragraph.id, k)}>×</span>
              </span>
            )
          })}
        </div>
        {/* Rich text editor */}
        <div
          className="rte"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            actions.updateParagraph(paragraph.id, { html: (e.target as HTMLElement).innerHTML })
          }}
          dangerouslySetInnerHTML={{ __html: paragraph.html }}
        />
        {showPrompt && (
          <ModalPrompt
            title="Add keyword(s)"
            placeholder="e.g. React, TypeScript, hooks"
            onSubmit={(v) => {
              const parts = v.split(',').map(s => s.trim()).filter(Boolean)
              parts.forEach(k => actions.addKeyword(paragraph.id, k))
              setShowPrompt(false)
            }}
            onCancel={() => setShowPrompt(false)}
          />
        )}
      </div>
    </div>
  )
}
