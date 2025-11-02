import React, { useCallback, useEffect, useRef } from 'react'
import { useAppState } from '@/state/AppStateContext'
import { generateCoverLetterHTML } from '@/state/logic'

export default function CoverLetterEditor() {
  const { state, actions } = useAppState()
  const editorRef = useRef<HTMLDivElement>(null)
  // Only apply state updates when explicitly requested (e.g. clicking Update)
  const applyNextStateHTML = useRef(false)
  
  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current && state.coverLetterHTML) {
      editorRef.current.innerHTML = state.coverLetterHTML
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update the DOM directly when coverLetterHTML changes, but only when we requested it
  useEffect(() => {
    if (!applyNextStateHTML.current) return
    if (editorRef.current && editorRef.current.innerHTML !== state.coverLetterHTML) {
      editorRef.current.innerHTML = state.coverLetterHTML
    }
    applyNextStateHTML.current = false
  }, [state.coverLetterHTML])

  const handleUpdate = useCallback(() => {
    // Compute and set state (for persistence), then explicitly apply from state once it updates
    const html = generateCoverLetterHTML(state.paragraphs, state.highlightInCoverLetter, state.darkMode)
    applyNextStateHTML.current = true
    // Reuse existing action to keep storage in sync
    actions.generateCoverLetter()
    // As an immediate UX improvement, also apply to DOM directly to avoid visible delay
    if (editorRef.current) editorRef.current.innerHTML = html
  }, [actions, state.paragraphs, state.highlightInCoverLetter, state.darkMode])
  
  return (
    <div className="panel">
      <h3>
        Cover Letter
  <button className="toggle" style={{ float: 'right' }} onClick={handleUpdate} title="Update Cover Letter">🔄</button>
      </h3>
      <div className="content">
        <div
          ref={editorRef}
          className="rte"
          contentEditable
          suppressContentEditableWarning
          onInput={() => { /* Leave user edits in place; do not auto-sync to state */ }}
        />
      </div>
    </div>
  )
}
