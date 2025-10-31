import React, { useMemo, useState, useEffect } from 'react'
import ParagraphGroups from './components/ParagraphGroups'
import JobPostingEditor from './components/JobPostingEditor'
import CoverLetterEditor from './components/CoverLetterEditor'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import TopBar from './components/TopBar'

function ResponsivePanels() {
  const { state } = useAppState()
  const [activeTabs, setActiveTabs] = useState<Set<'paragraphs' | 'job' | 'cover'>>(new Set(['paragraphs']))

  // Apply dark mode class to body
  useEffect(() => {
    if (state.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [state.darkMode])

  const isNarrow = useMemo(() => {
    // Basic responsive breakpoint
    return typeof window !== 'undefined' ? window.innerWidth < 900 : true
  }, [typeof window !== 'undefined' ? window.innerWidth : 0])

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
      }
      return next
    })
  }

  const tabs = (
    <div className="tabs">
      <button className={activeTabs.has('paragraphs') ? 'active' : ''} onClick={() => toggleTab('paragraphs')}>Paragraphs</button>
      <button className={activeTabs.has('job') ? 'active' : ''} onClick={() => toggleTab('job')}>Job Posting</button>
      <button className={activeTabs.has('cover') ? 'active' : ''} onClick={() => toggleTab('cover')}>Cover Letter</button>
    </div>
  )

  if (isNarrow) {
    const tabOrder: ('paragraphs' | 'job' | 'cover')[] = ['paragraphs', 'job', 'cover']
    const activeTabsArray = tabOrder.filter(t => activeTabs.has(t))
    
    return (
      <div className="container">
        {tabs}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeTabsArray.length}, 1fr)`, gap: '8px' }}>
          {activeTabsArray.map(tab => {
            if (tab === 'paragraphs') return <div key={tab}><ParagraphGroups /></div>
            if (tab === 'job') return <JobPostingEditor key={tab} />
            if (tab === 'cover') return <CoverLetterEditor key={tab} />
            return null
          })}
        </div>
      </div>
    )
  }

  // Desktop: show active tabs side by side
  const activeTabList = (['paragraphs', 'job', 'cover'] as const).filter(t => activeTabs.has(t))
  const gridCols = activeTabList.length
  
  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '8px', padding: '8px' }}>
      {activeTabList.map(tab => {
        if (tab === 'paragraphs') return <div key={tab} className="col"><ParagraphGroups /></div>
        if (tab === 'job') return <div key={tab} className="col"><JobPostingEditor /></div>
        if (tab === 'cover') return <div key={tab} className="col"><CoverLetterEditor /></div>
        return null
      })}
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <TopBar />
      <ResponsivePanels />
    </AppStateProvider>
  )
}
