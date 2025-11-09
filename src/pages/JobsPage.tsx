import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from '../state/AppStateContext'
import { Job, JobStatus } from '../state/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STATUS_COLORS: Record<JobStatus, string> = {
  open: '#94a3b8', // slate
  applied: '#fbbf24', // yellow
  rejected: '#ef4444', // red
  interview: '#f97316', // orange
  accepted: '#10b981', // green
}

const STATUS_LABELS: Record<JobStatus, string> = {
  open: 'Open',
  applied: 'Applied',
  rejected: 'Rejected',
  interview: 'Interview',
  accepted: 'Accepted',
}

export default function JobsPage({ onOpenJob }: { onOpenJob?: (id: string) => void }) {
  const { state, actions } = useAppState()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = state.jobs.findIndex(j => j.id === active.id)
    const newIndex = state.jobs.findIndex(j => j.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) actions.reorderJobs(oldIndex, newIndex)
  }

  const handleAddJob = () => {
    // Create and immediately navigate to details using returned id when available
    let newId: string | undefined
    // Support both implementations gracefully
    if ((actions as any).addJobAndGetId) {
      newId = (actions as any).addJobAndGetId()
    } else {
      actions.addJob()
      // Fallback: open the last job on next tick
      setTimeout(() => {
        const last = state.jobs[state.jobs.length - 1]
        if (last && onOpenJob) onOpenJob(last.id)
      }, 0)
    }
    if (newId && onOpenJob) onOpenJob(newId)
  }

  return (
    <div className="jobs-page">
      <div className="jobs-list">
        {state.jobs.length === 0 && (
          <div className="jobs-empty">
            <p>No jobs yet. Click "+ Add Job" to get started.</p>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={state.jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
            {state.jobs.map((job, idx) => (
              <JobItem key={job.id} job={job} onOpen={() => onOpenJob?.(job.id)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="align-items-center mx-auto justify-content-center text-center" style={{ marginTop: '16px' }}>
        <button className="btn btn-outline-secondary" onClick={handleAddJob}>+ Add Job</button>
      </div>
    </div>
  )
}

function JobItem({ job, onOpen }: { job: Job; onOpen?: () => void }) {
  const { actions } = useAppState()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const deletePopupRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? '1' : undefined,
  } as React.CSSProperties

  // Close delete popup when clicking outside
  useEffect(() => {
    if (!showDeleteConfirm) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target as Node) &&
        deleteButtonRef.current &&
        !deleteButtonRef.current.contains(event.target as Node)
      ) {
        setShowDeleteConfirm(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDeleteConfirm])

  return (
    <div ref={setNodeRef} style={style} className={`job-preview ${isDragging ? 'dragging' : ''} ${showDeleteConfirm ? 'dialog-open' : ''}`} onClick={onOpen}>
      <button className="job-drag-handle" title="Drag to reorder" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>⠿</button>
      <div className="job-preview-content">
        <div className="job-preview-title">{job.title || 'Untitled Job'}</div>
        <div className="job-preview-company">{job.company || 'No Company'}</div>
      </div>
      <span
        className="job-status-badge"
        style={{ backgroundColor: STATUS_COLORS[job.status], display: 'inline-block' }}
        title={`Status: ${STATUS_LABELS[job.status]}`}
      >
        {STATUS_LABELS[job.status]}
      </span>
      <button
        ref={deleteButtonRef}
        className="job-preview-delete"
        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
        title="Delete job"
      >
        🗑️
      </button>

      {showDeleteConfirm && deleteButtonRef.current && (() => {
        const rect = deleteButtonRef.current.getBoundingClientRect()
        const container = document.querySelector('.jobs-page') as HTMLElement | null
        const cRect = container?.getBoundingClientRect()
        const containerLeft = cRect ? cRect.left : 0
        const containerTop = cRect ? cRect.top : 0
        let left = rect.right - containerLeft + 8
        let top = rect.top - containerTop
        const popupW = 260
        const popupH = 130
        const containerW = cRect ? cRect.width : window.innerWidth
        const containerH = cRect ? cRect.height : window.innerHeight
        if (left + popupW > containerW - 8) {
          left = Math.max(8, rect.left - containerLeft - popupW - 8)
        }
        if (top + popupH > containerH - 8) {
          top = Math.max(8, containerH - popupH - 8)
        }
        return (
        <div
          ref={deletePopupRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top,
            left,
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '200px',
            maxWidth: '280px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Delete Job?</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>This action cannot be undone.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--input-bg)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); actions.deleteJob(job.id); setShowDeleteConfirm(false) }}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                border: '1px solid #ef4444',
                borderRadius: 4,
                background: '#ef4444',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
