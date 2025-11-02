import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function JobPostingEditor() {
  const { state, actions } = useAppState()

  return (
    <div className="panel">
      <h3>Job Posting</h3>
      <div className="content">
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
