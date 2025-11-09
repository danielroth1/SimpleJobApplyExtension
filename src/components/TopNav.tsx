import React, { useState, useRef, useEffect } from 'react'
import { useAppState } from '../state/AppStateContext'
import TopBar from './TopBar'

interface TopNavProps {
  currentPage: string
  onNavigate: (page: string) => void
  pageTitle?: string
  showTopBarControls?: boolean
}

export default function TopNav({ currentPage, onNavigate, pageTitle, showTopBarControls }: TopNavProps) {
  const { actions } = useAppState()
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleMenu = () => setMenuOpen(!menuOpen)
  const closeMenu = () => setMenuOpen(false)

  const handleNavigate = (page: string) => {
    onNavigate(page)
    closeMenu()
  }

  const handleSave = async () => {
    await actions.saveToFile()
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
        
        {showTopBarControls && <TopBar />}
        {pageTitle && <h2 className="page-title-header">{pageTitle}</h2>}
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
            <span>Jobs</span>
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
            className={`burger-menu-item ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => handleNavigate('about')}
            title="About this extension and contact information"
          >
            <span className="burger-menu-icon">ℹ️</span>
            <span>About</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileInput}
        className="hidden"
      />
    </>
  )
}
