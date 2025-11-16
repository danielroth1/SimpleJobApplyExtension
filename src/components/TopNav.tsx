import React, { useState, useRef, useEffect } from 'react'
import { useAppState } from '../state/AppStateContext'
import TopBar from './TopBar'
import SiteRulesEditor from './SiteRulesEditor'

interface TopNavProps {
  currentPage: string
  onNavigate: (page: string) => void
  pageTitle?: string
  showTopBarControls?: boolean
  onBack?: () => void
  // Job detail editing support
  editableTitle?: boolean
  selectedJobId?: string | null
  onNavigateToJob?: (jobId: string) => void
}

export default function TopNav({ currentPage, onNavigate, pageTitle, showTopBarControls, onBack, editableTitle, selectedJobId, onNavigateToJob }: TopNavProps) {
  const { state, actions } = useAppState()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSiteRules, setShowSiteRules] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFilename, setSaveFilename] = useState('simple-job-apply-state')
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const saveDialogRef = useRef<HTMLDivElement>(null)

  const selectedJob = selectedJobId ? state.jobs.find(j => j.id === selectedJobId) : undefined
  const effectiveTitle = pageTitle ?? (selectedJob ? (selectedJob.title || 'Untitled Job') : undefined)

  useEffect(() => {
    if (editableTitle && selectedJob) {
      setTitleInput(selectedJob.title || '')
    }
  }, [editableTitle, selectedJobId, selectedJob?.title])

  const toggleMenu = () => setMenuOpen(!menuOpen)
  const closeMenu = () => setMenuOpen(false)

  const handleNavigate = (page: string) => {
    onNavigate(page)
    closeMenu()
  }

  const handleSave = () => {
    setShowSaveDialog(true)
  }

  const handleSaveConfirm = async () => {
    await actions.saveToFile(saveFilename + '.json')
    setShowSaveDialog(false)
    closeMenu()
  }

  const handleLoad = () => {
    fileInputRef.current?.click()
    closeMenu()
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await actions.loadFromFile(file)
    }
    e.target.value = '' // Reset
  }

  // Close menu when clicking outside
  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Element
        if (!target.closest('.burger-menu-sidebar') && !target.closest('.burger-btn')) {
          closeMenu()
        }
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpen])

  // Close save dialog when clicking outside
  useEffect(() => {
    if (showSaveDialog) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Element
        if (saveDialogRef.current && !saveDialogRef.current.contains(target) && 
            saveButtonRef.current && !saveButtonRef.current.contains(target)) {
          setShowSaveDialog(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSaveDialog])

  return (
    <>
      <div className="top-nav">
        <button 
          className="burger-btn" 
          onClick={toggleMenu}
          title="Navigation menu"
          aria-label="Navigation menu"
        >
          <span className="burger-icon">☰</span>
        </button>
        
        {showTopBarControls && <TopBar onNavigateToJob={onNavigateToJob} />}
        {effectiveTitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onBack && (
              <button className="btn btn-outline-secondary btn-sm" onClick={onBack} title="Back">←</button>
            )}
            {!editableTitle && (
              <h2 className="page-title-header">{effectiveTitle}</h2>
            )}
            {editableTitle && (
              isEditingTitle ? (
                <input
                  autoFocus
                  className="form-control"
                  style={{ maxWidth: 380, height: 30, padding: '2px 8px' }}
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => { if (selectedJob) actions.updateJob(selectedJob.id, { title: titleInput }); setIsEditingTitle(false) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { if (selectedJob) actions.updateJob(selectedJob.id, { title: titleInput }); setIsEditingTitle(false) }
                    if (e.key === 'Escape') { setIsEditingTitle(false); setTitleInput(selectedJob?.title || '') }
                  }}
                />
              ) : (
                <h2 className="page-title-header" style={{ cursor: 'text' }} onClick={() => setIsEditingTitle(true)} title="Click to edit title">
                  {effectiveTitle}
                </h2>
              )
            )}
          </div>
        )}
      </div>

      {menuOpen && <div className="burger-menu-overlay" onClick={closeMenu} />}
      
      <div className={`burger-menu-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="burger-menu-header">
          <h3>Menu</h3>
        </div>

        <div className="burger-menu-section">
          <button 
            className={`burger-menu-item ${currentPage === 'job-analyzer' ? 'active' : ''}`}
            onClick={() => handleNavigate('job-analyzer')}
            title="Analyze job postings and generate cover letters"
          >
            <span className="burger-menu-icon">🔍</span>
            <span>Job Analyzer</span>
          </button>
          
          <button 
            className={`burger-menu-item ${currentPage === 'jobs' ? 'active' : ''}`}
            onClick={() => handleNavigate('jobs')}
            title="Manage your job applications"
          >
            <span className="burger-menu-icon">💼</span>
            <span>Saved Jobs</span>
          </button>
          
          <button 
            className={`burger-menu-item ${currentPage === 'combine-pdfs' ? 'active' : ''}`}
            onClick={() => handleNavigate('combine-pdfs')}
            title="Combine multiple PDF documents into one"
          >
            <span className="burger-menu-icon">📄</span>
            <span>Combine PDFs</span>
          </button>
        </div>

        <div className="burger-menu-divider" />

        <div className="burger-menu-section">
          <button 
            ref={saveButtonRef}
            className="burger-menu-item"
            onClick={handleSave}
            title="Save current state to file"
          >
            <span className="burger-menu-icon">💾</span>
            <span>Save</span>
          </button>
          
          <button 
            className="burger-menu-item"
            onClick={handleLoad}
            title="Load state from file"
          >
            <span className="burger-menu-icon">📂</span>
            <span>Load</span>
          </button>
        </div>

        <div className="burger-menu-divider" />

        <div className="burger-menu-section">
          <button 
            className="burger-menu-item"
            onClick={() => { setShowSiteRules(true); closeMenu() }}
            title="Configure site rules for extracting job information"
          >
            <span className="burger-menu-icon">⚙️</span>
            <span>Site Rules</span>
          </button>
          
          <button 
            className={`burger-menu-item ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavigate('settings')}
            title="Application settings"
          >
            <span className="burger-menu-icon">🔧</span>
            <span>Settings</span>
          </button>
        </div>

        <div className="burger-menu-divider" />

        <div className="burger-menu-section">
          <button 
            className={`burger-menu-item ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => handleNavigate('about')}
            title="About this extension and contact information"
          >
            <span className="burger-menu-icon">ℹ️</span>
            <span>About</span>
          </button>
        </div>
      </div>

      {showSiteRules && <SiteRulesEditor onClose={() => setShowSiteRules(false)} />}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Save dialog */}
      {showSaveDialog && saveButtonRef.current && (() => {
        const rect = saveButtonRef.current.getBoundingClientRect()
        let left = rect.right + 8
        let top = rect.top
        const dialogW = 300
        const dialogH = 140
        
        // Ensure dialog stays in viewport
        if (left + dialogW > window.innerWidth - 8) {
          left = Math.max(8, rect.left - dialogW - 8)
        }
        if (top + dialogH > window.innerHeight - 8) {
          top = Math.max(8, window.innerHeight - dialogH - 8)
        }

        return (
          <div
            ref={saveDialogRef}
            style={{
              position: 'fixed',
              top,
              left,
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10001,
              minWidth: dialogW,
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
              Save File
            </div>
            <input
              autoFocus
              type="text"
              value={saveFilename}
              onChange={(e) => setSaveFilename(e.target.value)}
              placeholder="filename"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveConfirm()
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false)
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                marginBottom: '12px',
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              .json extension will be added automatically
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowSaveDialog(false)}
                className="btn btn-outline-secondary btn-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveConfirm}
                className="btn btn-primary btn-sm"
              >
                Save
              </button>
            </div>
          </div>
        )
      })()}
    </>
  )
}
