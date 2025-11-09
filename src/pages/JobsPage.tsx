import React from 'react'
import { useAppState } from '../state/AppStateContext'
import { JobStatus } from '../state/types'

const STATUS_COLORS: Record<JobStatus, string> = {
  open: 'var(--chip-bg)',
  applied: '#fbbf24', // yellow
  rejected: '#ef4444', // red
  interview: '#f97316', // orange
  accepted: '#10b981', // green
}

export default function JobsPage() {
  const { state, actions } = useAppState()
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      actions.reorderJobs(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  const handleAddJob = () => {
    actions.addJob()
  }

  const handleDeleteJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation()
    if (confirm('Delete this job?')) {
      actions.deleteJob(jobId)
    }
  }

  const handleJobClick = (jobId: string) => {
    // TODO: Navigate to job detail page
    console.log('Open job detail:', jobId)
  }

  return (
    <div className="jobs-page">
      <div className="jobs-header">
        <h2>Jobs</h2>
        <button className="btn btn-primary" onClick={handleAddJob} title="Add new job">
          <span>+ Add Job</span>
        </button>
      </div>

      <div className="jobs-list">
        {state.jobs.length === 0 && (
          <div className="jobs-empty">
            <p>No jobs yet. Click "Add Job" to get started.</p>
          </div>
        )}

        {state.jobs.map((job, index) => (
          <div
            key={job.id}
            className="job-preview"
            style={{ backgroundColor: STATUS_COLORS[job.status] }}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => handleJobClick(job.id)}
          >
            <div className="job-preview-content">
              <div className="job-preview-title">{job.title || 'Untitled Job'}</div>
              <div className="job-preview-company">{job.company || 'No Company'}</div>
            </div>
            <button
              className="job-preview-delete"
              onClick={(e) => handleDeleteJob(e, job.id)}
              title="Delete job"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
