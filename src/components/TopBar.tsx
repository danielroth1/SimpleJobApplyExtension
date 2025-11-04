import React, { useRef, useState, useEffect } from 'react'
import { useAppState } from '@/state/AppStateContext'
import SiteRulesEditor from './SiteRulesEditor'

export default function TopBar() {
  const { state, actions } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSiteRules, setShowSiteRules] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

  return (
    <div className="topbar">
      <button className="btn btn-primary btn-sm" onClick={actions.analyzeNow} title="Analyze the job posting and match keywords with your paragraphs">
        🔍 Analyze
      </button>
      <button className="btn btn-outline-secondary btn-sm" onClick={actions.pasteFromClipboard} title="Paste job posting from clipboard">
        📋 Paste posting
      </button>
      <button className="btn btn-outline-secondary btn-sm" onClick={actions.analyzeCurrentPage} title="Extract and analyze job posting from the current active tab">
        🌐 Analyze current page
      </button>
      <div className="settings-container" ref={settingsRef}>
        <button 
          className="btn btn-outline-secondary btn-sm" 
          onClick={(e) => {
            // Shift+click to toggle debug mode
            if (e.shiftKey) {
              actions.toggleDebugMode()
            } else {
              setShowSettings(!showSettings)
            }
          }}
          title={state.debugMode ? "Settings (Debug Mode ON - Shift+click to disable)" : "Settings (Shift+click to enable Debug Mode)"}
        >⚙</button>
        {showSettings && (
          <div className="settings-menu">
            <div className="settings-menu-item" onClick={actions.toggleDarkMode}>
              <span>{state.darkMode ? '☀' : '🌙'}</span>
              <span>{state.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className="settings-menu-divider" />
            <div className="settings-menu-item" title="When enabled, matching keywords are highlighted in the generated cover letter." onClick={actions.toggleHighlightInCoverLetter}>
              <input type="checkbox" checked={state.highlightInCoverLetter} onChange={() => {}} />
              <span>Highlight in cover letter</span>
            </div>
            <div className="settings-menu-item" title="When enabled, LinkedIn job pages automatically trigger analysis when you navigate to a new posting." onClick={actions.toggleAutoAnalyze}>
              <input type="checkbox" checked={state.autoAnalyze} onChange={() => {}} />
              <span>Auto-analyze pages</span>
            </div>
            <div className="settings-menu-divider" />
            <div className="settings-menu-item" onClick={() => { actions.saveToFile(); setShowSettings(false); }}>
              <span>💾</span>
              <span>Save</span>
            </div>
            <div className="settings-menu-item" onClick={() => { fileRef.current?.click(); setShowSettings(false); }}>
              <span>📂</span>
              <span>Load</span>
            </div>
            <div className="settings-menu-divider" />
            <div className="settings-menu-item" onClick={() => { setShowSiteRules(true); setShowSettings(false); }}>
              <span>🌐</span>
              <span>Site Rules</span>
            </div>
            {state.debugMode && (
              <>
                <div className="settings-menu-divider" />
                <div className="settings-menu-item" onClick={() => { actions.downloadCurrentPageHtml(); setShowSettings(false); }} title="Download current page as HTML">
                  <span>⬇️</span>
                  <span>Download page</span>
                </div>
                <div className="settings-menu-item" onClick={() => { actions.debugPageState(); setShowSettings(false); }} title="Debug: Log page DOM state to console">
                  <span>🔍</span>
                  <span>Debug</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <input className="hidden" type="file" accept="application/json" ref={fileRef} onChange={(e)=>{
        const f = e.target.files?.[0]
        if (f) actions.loadFromFile(f)
        e.currentTarget.value = ''
      }} />
      
      {showSiteRules && <SiteRulesEditor onClose={() => setShowSiteRules(false)} />}
    </div>
  )
}
