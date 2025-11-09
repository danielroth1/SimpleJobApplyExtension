import React, { useState } from 'react'
import { AppStateProvider } from './state/AppStateContext'
import BurgerMenu from './components/BurgerMenu'
import JobAnalyzerPage from './pages/JobAnalyzerPage'
import CombinePDFsPage from './pages/CombinePDFsPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  const [currentPage, setCurrentPage] = useState('job-analyzer')

  const renderPage = () => {
    switch (currentPage) {
      case 'job-analyzer':
        return <JobAnalyzerPage />
      case 'combine-pdfs':
        return <CombinePDFsPage />
      case 'about':
        return <AboutPage />
      default:
        return <JobAnalyzerPage />
    }
  }

  return (
    <AppStateProvider>
      <div className="app-container">
        <BurgerMenu currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </AppStateProvider>
  )
}
