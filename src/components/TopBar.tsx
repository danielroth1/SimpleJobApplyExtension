import React, { useRef, useState, useEffect } from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function TopBar() {
  const { state, actions } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showSettings, setShowSettings] = useState(false)
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
      <button className="primary" onClick={actions.analyzeNow}>Analyze</button>
      <span className="small"> | </span>
      <button onClick={actions.pasteFromClipboard}>Paste posting</button>
      <button onClick={actions.analyzeCurrentPage}>Analyze current page</button>
      <span className="small"> | </span>
      <div className="settings-container" ref={settingsRef}>
        <button onClick={() => setShowSettings(!showSettings)}>⚙</button>
        {showSettings && (
          <div className="settings-menu">
            <div className="settings-menu-item" onClick={actions.toggleDarkMode}>
              <span>{state.darkMode ? '☀' : '🌙'}</span>
              <span>{state.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
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
          </div>
        )}
      </div>
      <input className="hidden" type="file" accept="application/json" ref={fileRef} onChange={(e)=>{
        const f = e.target.files?.[0]
        if (f) actions.loadFromFile(f)
        e.currentTarget.value = ''
      }} />
    </div>
  )
}
