import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function JobPostingEditor() {
  const { state, actions } = useAppState()

  return (
    <div className="d-flex flex-column gap-2">
      <div className='d-flex gap-2'>
        <h3>Job Posting</h3>
        <button className="btn btn-outline-secondary btn-sm" onClick={actions.pasteFromClipboard} title="Paste job posting from clipboard">
          📋 Paste posting
        </button>
      </div>
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
