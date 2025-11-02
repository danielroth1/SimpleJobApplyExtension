import React, { useEffect, useRef } from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function CoverLetterEditor() {
  const { state, actions } = useAppState()
  const editorRef = useRef<HTMLDivElement>(null)
  
  // Update the DOM directly when coverLetterHTML changes
  // This avoids React's reconciliation issues with contentEditable + dangerouslySetInnerHTML
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== state.coverLetterHTML) {
      editorRef.current.innerHTML = state.coverLetterHTML
    }
  }, [state.coverLetterHTML])
  
  return (
    <div className="panel">
      <h3>
        Cover Letter
        <button className="toggle" style={{ float: 'right' }} onClick={actions.generateCoverLetter} title="Update Cover Letter">🔄</button>
      </h3>
      <div className="content">
        <div
          ref={editorRef}
          className="rte"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => { /* allow manual edits without overriding immediately */ }}
        />
      </div>
    </div>
  )
}
