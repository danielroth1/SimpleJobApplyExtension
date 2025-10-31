import React, { useMemo, useState } from 'react'
import ParagraphGroups from './components/ParagraphGroups'
import JobPostingEditor from './components/JobPostingEditor'
import CoverLetterEditor from './components/CoverLetterEditor'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import TopBar from './components/TopBar'

function ResponsivePanels() {
  const { state } = useAppState()
  const [activeTab, setActiveTab] = useState<'paragraphs' | 'job' | 'cover'>('paragraphs')

  const isNarrow = useMemo(() => {
    // Basic responsive breakpoint
    return typeof window !== 'undefined' ? window.innerWidth < 900 : true
  }, [typeof window !== 'undefined' ? window.innerWidth : 0])

  const tabs = (
    <div className="tabs">
      <button className={activeTab === 'paragraphs' ? 'active' : ''} onClick={() => setActiveTab('paragraphs')}>Paragraphs</button>
      <button className={activeTab === 'job' ? 'active' : ''} onClick={() => setActiveTab('job')}>Job Posting</button>
      <button className={activeTab === 'cover' ? 'active' : ''} onClick={() => setActiveTab('cover')}>Cover Letter</button>
    </div>
  )

  if (isNarrow) {
    return (
      <div className="container">
        {tabs}
        {activeTab === 'paragraphs' && <ParagraphGroups />}
        {activeTab === 'job' && <JobPostingEditor />}
        {activeTab === 'cover' && <CoverLetterEditor />}
      </div>
    )
  }

  return (
    <div className="container three-col">
      <div className="col"><ParagraphGroups /></div>
      <div className="col"><JobPostingEditor /></div>
      <div className="col"><CoverLetterEditor /></div>
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
