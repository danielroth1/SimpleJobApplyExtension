import React, { useEffect, useState } from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function TopBar() {
  const { state, actions } = useAppState()
  const [currentPageJobId, setCurrentPageJobId] = useState<string | null>(null)
  const [hasMatchingSiteRule, setHasMatchingSiteRule] = useState(false)

  // Check if current page matches a site rule and extract job ID
  useEffect(() => {
    const checkCurrentPage = async () => {
      try {
        const api = (window as any).browser ?? (window as any).chrome
        const [tab] = await api.tabs.query({ active: true, currentWindow: true })
        
        if (!tab?.url) {
          setHasMatchingSiteRule(false)
          setCurrentPageJobId(null)
          return
        }

        const url = new URL(tab.url)
        const domain = url.hostname.replace('www.', '')
        
        // Check if we have a site rule for this domain
        const matchingRule = state.siteRules.find(rule => domain.includes(rule.domain))
        setHasMatchingSiteRule(!!matchingRule)
        
        // Extract job ID from URL if present
        const jobId = url.searchParams.get('currentJobId')
        setCurrentPageJobId(jobId)
      } catch (e) {
        console.error('[TopBar] Failed to check current page:', e)
        setHasMatchingSiteRule(false)
        setCurrentPageJobId(null)
      }
    }

    checkCurrentPage()
    
    // Re-check when jobs or site rules change
  }, [state.siteRules, state.jobs])

  // Find if a job with this external ID already exists
  const existingJob = currentPageJobId 
    ? state.jobs.find(job => job.externalId === currentPageJobId)
    : null

  const handleSaveJob = async () => {
    // Create a new job
    const newId = (actions as any).addJobAndGetId ? (actions as any).addJobAndGetId() : (() => {
      actions.addJob()
      return null
    })()
    
    // Extract data from page
    if (newId) {
      try {
        const data = await actions.extractJobDataFromPage()
        if (data && Object.keys(data).length > 0) {
          actions.updateJob(newId, data)
        }
      } catch (e) {
        console.error('Failed to extract job data:', e)
      }
    }
  }

  const handleUnsaveJob = () => {
    if (existingJob) {
      actions.deleteJob(existingJob.id)
    }
  }

  return (
    <div className="topbar-controls">
      <button className="btn btn-primary btn-sm" onClick={actions.analyzeCurrentPage} title="Extract and analyze job posting from the current active tab">
        🌐 Analyze current page
      </button>
      
      {hasMatchingSiteRule && (
        existingJob ? (
          <button 
            className="btn btn-outline-danger btn-sm" 
            onClick={handleUnsaveJob} 
            title="Remove this job from saved jobs"
          >
            🗑️ Unsave Job
          </button>
        ) : (
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={handleSaveJob} 
            title="Save current page as a job"
          >
            💼 Save Job
          </button>
        )
      )}
    </div>
  )
}
