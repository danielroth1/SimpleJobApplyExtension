import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function CoverLetterEditor() {
  const { state, actions } = useAppState()
  return (
    <div className="panel">
      <h3>Cover Letter</h3>
      <div className="content">
        <div className="actions-row">
          <button className="toggle" onClick={actions.generateCoverLetter}>Regenerate</button>
          <span className="small">Includes paragraphs with Included or Auto-include flags</span>
        </div>
        <div
          className="rte"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => { /* allow manual edits without overriding immediately */ }}
          dangerouslySetInnerHTML={{ __html: state.coverLetterHTML }}
        />
      </div>
    </div>
  )
}
