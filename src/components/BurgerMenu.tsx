import React, { useState, useRef, useEffect } from 'react'

interface BurgerMenuProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function BurgerMenu({ currentPage, onNavigate }: BurgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNavigate = (page: string) => {
    onNavigate(page)
    setIsOpen(false)
  }

  return (
    <div className="burger-menu-container" ref={menuRef}>
      <button 
        className="burger-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title="Navigation menu"
        aria-label="Navigation menu"
      >
        <span className="burger-icon">☰</span>
      </button>
      
      {isOpen && (
        <div className="burger-menu">
          <button 
            className={`burger-menu-item ${currentPage === 'job-analyzer' ? 'active' : ''}`}
            onClick={() => handleNavigate('job-analyzer')}
            title="Analyze job postings and generate cover letters"
          >
            <span className="burger-menu-icon">🔍</span>
            <span>Job Analyzer</span>
          </button>
          
          <button 
            className={`burger-menu-item ${currentPage === 'combine-pdfs' ? 'active' : ''}`}
            onClick={() => handleNavigate('combine-pdfs')}
            title="Combine multiple PDF documents into one"
          >
            <span className="burger-menu-icon">📄</span>
            <span>Combine PDFs</span>
          </button>
          
          <div className="burger-menu-divider" />
          
          <button 
            className={`burger-menu-item ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => handleNavigate('about')}
            title="About this extension and contact information"
          >
            <span className="burger-menu-icon">ℹ️</span>
            <span>About</span>
          </button>
        </div>
      )}
    </div>
  )
}
