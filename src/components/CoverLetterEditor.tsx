import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function CoverLetterEditor() {
  const { state, actions } = useAppState()
  return (
    <div className="panel">
      <h3>
        Cover Letter
        <button className="toggle" style={{ float: 'right' }} onClick={actions.generateCoverLetter} title="Update Cover Letter">🔄</button>
      </h3>
      <div className="content">
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
