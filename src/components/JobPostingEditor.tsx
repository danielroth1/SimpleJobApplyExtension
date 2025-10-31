import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function JobPostingEditor() {
  const { state, actions } = useAppState()

  return (
    <div className="panel">
      <h3>Job Posting <span className="small">(single font)</span></h3>
      <div className="content">
        <div className="actions-row">
          <button className="toggle" onClick={() => actions.setJobEditorHidden(!state.jobEditorHidden)}>{state.jobEditorHidden ? 'Show' : 'Hide'}</button>
          <span className="small">Click Analyze to highlight keywords</span>
        </div>
        {!state.jobEditorHidden && (
          <div
            className="editor"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => actions.setJobPostingRaw((e.target as HTMLElement).innerText)}
            dangerouslySetInnerHTML={{ __html: state.jobPostingHTML || (state.jobPostingRaw ? state.jobPostingRaw.replace(/</g, '&lt;') : '') }}
          />
        )}
      </div>
    </div>
  )
}
