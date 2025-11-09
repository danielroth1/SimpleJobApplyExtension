import React, { useState } from 'react'
import { AppStateProvider } from './state/AppStateContext'
import TopNav from './components/TopNav'
import JobAnalyzerPage from './pages/JobAnalyzerPage'
import JobsPage from './pages/JobsPage'
import CombinePDFsPage from './pages/CombinePDFsPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  const [currentPage, setCurrentPage] = useState('job-analyzer')

  const renderPage = () => {
    switch (currentPage) {
      case 'job-analyzer':
        return { page: <JobAnalyzerPage />, showTopBar: true }
      case 'jobs':
        return { page: <JobsPage />, showTopBar: false, title: 'Jobs' }
      case 'combine-pdfs':
        return { page: <CombinePDFsPage />, showTopBar: false, title: 'Combine PDFs' }
      case 'about':
        return { page: <AboutPage />, showTopBar: false, title: 'About' }
      default:
        return { page: <JobAnalyzerPage />, showTopBar: true }
    }
  }

  const { page, showTopBar, title } = renderPage()

  return (
    <AppStateProvider>
      <TopNav 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        pageTitle={title}
        showTopBarControls={showTopBar}
      />
      <div className="page-content">
        {page}
      </div>
    </AppStateProvider>
  )
}
