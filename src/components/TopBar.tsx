import React, { useRef } from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function TopBar() {
  const { actions } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="topbar">
      <button className="primary" onClick={actions.analyzeNow}>Analyze</button>
      <button onClick={actions.generateCoverLetter}>Update Cover Letter</button>
      <span className="small"> | </span>
      <button onClick={actions.pasteFromClipboard}>Paste posting</button>
      <button onClick={actions.analyzeCurrentPage}>Analyze current page</button>
      <span className="small"> | </span>
      <button onClick={actions.saveToFile}>Save</button>
      <button onClick={() => fileRef.current?.click()}>Load</button>
      <input className="hidden" type="file" accept="application/json" ref={fileRef} onChange={(e)=>{
        const f = e.target.files?.[0]
        if (f) actions.loadFromFile(f)
        e.currentTarget.value = ''
      }} />
    </div>
  )
}
