import React, { useState, useEffect } from 'react'
import ParagraphGroups from '../components/ParagraphGroups'
import JobPostingEditor from '../components/JobPostingEditor'
import CoverLetterEditor from '../components/CoverLetterEditor'
import { useAppState } from '../state/AppStateContext'

export default function JobAnalyzerPage() {
  const { state, actions } = useAppState()
  const [activeTabs, setActiveTabs] = useState<Set<'paragraphs' | 'job' | 'cover'>>(new Set(['paragraphs']))
  const isCoverLetterVisible = activeTabs.has('cover')

  // Apply dark mode class to body
  useEffect(() => {
    if (state.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [state.darkMode])

  const toggleTab = (tab: 'paragraphs' | 'job' | 'cover') => {
    setActiveTabs(prev => {
      const next = new Set(prev)
      if (next.has(tab)) {
        // Don't allow closing all tabs
        if (next.size > 1) {
          next.delete(tab)
        }
      } else {
        next.add(tab)
        // Auto-update cover letter when it becomes visible
        if (tab === 'cover') {
          actions.generateCoverLetter();
        }
      }
      return next
    })
  }

  const activeTabList = (['paragraphs', 'job', 'cover'] as const).filter(t => activeTabs.has(t))
  const gridCols = activeTabList.length
  
  return (
    <div className="">
      <div className="tabs">
        <button className={activeTabs.has('paragraphs') ? 'active' : ''} onClick={() => toggleTab('paragraphs')}>Paragraphs</button>
        <button className={activeTabs.has('job') ? 'active' : ''} onClick={() => toggleTab('job')}>Job Posting</button>
        <button className={activeTabs.has('cover') ? 'active' : ''} onClick={() => toggleTab('cover')}>Cover Letter</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '8px', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
        {activeTabList.map(tab => {
          if (tab === 'paragraphs') return (
            <div key={tab} className="col" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <ParagraphGroups isCoverLetterVisible={isCoverLetterVisible} />
              </div>
            </div>
          )
          if (tab === 'job') return (
            <div key={tab} className="col" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <JobPostingEditor />
              </div>
            </div>
          )
          if (tab === 'cover') return (
            <div key={tab} className="col" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <CoverLetterEditor />
              </div>
            </div>
          )
          return null
        })}
      </div>
    </div>
  )
}
