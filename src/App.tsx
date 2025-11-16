import React, { useState } from 'react'
import { AppStateProvider } from './state/AppStateContext'
import TopNav from './components/TopNav'
import JobAnalyzerPage from './pages/JobAnalyzerPage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import CombinePDFsPage from './pages/CombinePDFsPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [currentPage, setCurrentPage] = useState('job-analyzer')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [previousPage, setPreviousPage] = useState<string>('job-analyzer')

  const handleNavigateToJob = (jobId: string) => {
    setPreviousPage(currentPage) // Remember where we came from
    setSelectedJobId(jobId)
    setCurrentPage('job-detail')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'job-analyzer':
        return { page: <JobAnalyzerPage />, showTopBar: true }
      case 'jobs':
        return { page: <JobsPage onOpenJob={(id) => { setPreviousPage('jobs'); setSelectedJobId(id); setCurrentPage('job-detail') }} />, showTopBar: false, title: 'Jobs' }
      case 'job-detail':
        return { page: <JobDetailPage jobId={selectedJobId} onBack={() => { setCurrentPage(previousPage); setSelectedJobId(null) }} />, showTopBar: false, title: undefined }
      case 'combine-pdfs':
        return { page: <CombinePDFsPage />, showTopBar: false, title: 'Combine PDFs' }
      case 'settings':
        return { page: <SettingsPage />, showTopBar: false, title: 'Settings' }
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
        pageTitle={currentPage === 'job-detail' ? undefined : title}
        onBack={currentPage === 'job-detail' ? () => { setCurrentPage(previousPage); setSelectedJobId(null) } : undefined}
        editableTitle={currentPage === 'job-detail'}
        selectedJobId={currentPage === 'job-detail' ? selectedJobId : undefined}
        showTopBarControls={showTopBar}
        onNavigateToJob={handleNavigateToJob}
      />
      <div className={`page-content ${currentPage === 'job-analyzer' ? 'no-scroll' : ''}`}>
        {page}
      </div>
    </AppStateProvider>
  )
}
