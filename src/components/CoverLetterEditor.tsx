import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState } from '@/state/AppStateContext'
import { generateCoverLetterHTML } from '@/state/logic'

export default function CoverLetterEditor() {
  const { state, actions } = useAppState()
  const editorRef = useRef<HTMLDivElement>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  
  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current && state.coverLetterHTML) {
      editorRef.current.innerHTML = state.coverLetterHTML
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update the DOM directly when coverLetterHTML changes, but only when we requested it
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== state.coverLetterHTML) {
      editorRef.current.innerHTML = state.coverLetterHTML
    }
  }, [state.coverLetterHTML])

  const handleUpdate = useCallback(() => {
    // Compute and set state (for persistence), then explicitly apply from state once it updates
    const html = generateCoverLetterHTML(state.paragraphs, state.highlightInCoverLetter, state.darkMode, state.currentRecruiterName)
    // Reuse existing action to keep storage in sync
    actions.generateCoverLetter()
    // As an immediate UX improvement, also apply to DOM directly to avoid visible delay
    if (editorRef.current) editorRef.current.innerHTML = html
  }, [actions, state.paragraphs, state.highlightInCoverLetter, state.darkMode, state.currentRecruiterName])

  const handleCopyToClipboard = useCallback(async () => {
    if (!editorRef.current) return
    try {
      const div = document.createElement('div')
      div.innerHTML = state.coverLetterHTML || editorRef.current.innerHTML || ''

      // Remove any background/highlight styles only
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT, null)
      while (walker.nextNode()) {
        const el = walker.currentNode as HTMLElement
        const computedStyle = window.getComputedStyle(el)
        const bg = computedStyle.backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          el.style.background = 'transparent'
          el.style.backgroundColor = 'transparent'
        }
      }

      const html = div.innerHTML.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ')
      const plainText = div.innerText.replace(/\u00A0/g, ' ')

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
      ])

      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (e) {
      console.error('Failed to copy to clipboard:', e)
    }
  }, [state.coverLetterHTML, state.darkMode])
  
  return (
    <div className="panel">
      <h3>
        Cover Letter
        <div style={{ float: 'right', display: 'flex', gap: '4px', alignItems: 'center' }}>
          {copySuccess && <span style={{ fontSize: '12px', color: 'var(--success, #10b981)', marginRight: '4px' }}>✓ Copied!</span>}
          <button 
            className="toggle" 
            onClick={handleCopyToClipboard} 
            title="Copy cover letter to clipboard"
            style={{ fontSize: '16px' }}
          >
            📋
          </button>
          <button className="toggle" onClick={handleUpdate} title="Update Cover Letter" style={{ fontSize: '16px' }}>🔄</button>
        </div>
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
