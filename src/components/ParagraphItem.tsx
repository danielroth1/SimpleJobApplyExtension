import React, { useMemo, useState } from 'react'
import { Paragraph } from '@/state/types'
import { useAppState } from '@/state/AppStateContext'
import { hslForIndex } from '@/state/logic'
import ModalPrompt from './ModalPrompt'

export default function ParagraphItem({ groupId, paragraph, colorIndex }: { groupId: string, paragraph: Paragraph, colorIndex: number }) {
  const { actions } = useAppState()
  const [showPrompt, setShowPrompt] = useState(false)
  const color = useMemo(() => hslForIndex(colorIndex), [colorIndex])

  return (
    <div>
      <div className="right-sidebar">
        <button className={`toggle ${paragraph.noLineBreak ? 'active' : ''}`} title="No line break after this paragraph" onClick={() => actions.updateParagraph(groupId, paragraph.id, { noLineBreak: !paragraph.noLineBreak })}>no-break</button>
        <button className={`toggle ${paragraph.autoInclude ? 'active' : ''}`} title="Always include in cover letter" onClick={() => actions.updateParagraph(groupId, paragraph.id, { autoInclude: !paragraph.autoInclude })}>auto-include</button>
        <button className={`toggle ${paragraph.included ? 'active' : ''}`} title="Included in cover letter" onClick={() => actions.updateParagraph(groupId, paragraph.id, { included: !paragraph.included })}>included</button>
      </div>
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
              <span className="x" onClick={() => actions.removeKeyword(groupId, paragraph.id, k)}>×</span>
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
          actions.updateParagraph(groupId, paragraph.id, { html: (e.target as HTMLElement).innerHTML })
        }}
        dangerouslySetInnerHTML={{ __html: paragraph.html }}
      />
      {showPrompt && (
        <ModalPrompt
          title="Add keyword(s)"
          placeholder="e.g. React, TypeScript, hooks"
          onSubmit={(v) => {
            const parts = v.split(',').map(s => s.trim()).filter(Boolean)
            parts.forEach(k => actions.addKeyword(groupId, paragraph.id, k))
            setShowPrompt(false)
          }}
          onCancel={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
