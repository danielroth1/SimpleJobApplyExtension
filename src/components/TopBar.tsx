import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function TopBar() {
  const { state, actions } = useAppState()

  const handleSaveJob = async () => {
    // Create a new job
    const newId = (actions as any).addJobAndGetId ? (actions as any).addJobAndGetId() : (() => {
      actions.addJob()
      return null
    })()
    
    // Try to prefill from page if enabled and we have a job ID
    if (newId && state.prefillNewJobs) {
      try {
        const data = await actions.extractJobDataFromPage()
        if (data && Object.keys(data).length > 0) {
          actions.updateJob(newId, data)
        }
      } catch (e) {
        console.error('Failed to prefill job data:', e)
      }
    }
  }

  return (
    <div className="topbar-controls">
      <button className="btn btn-primary btn-sm" onClick={actions.analyzeCurrentPage} title="Extract and analyze job posting from the current active tab">
        🌐 Analyze current page
      </button>
      <button className="btn btn-outline-secondary btn-sm" onClick={handleSaveJob} title="Save current page as a job">
        💼 Save Job
      </button>
    </div>
  )
}
