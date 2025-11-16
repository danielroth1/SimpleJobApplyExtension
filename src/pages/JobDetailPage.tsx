import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from '@/state/AppStateContext'
import { Job, JobStatus, OfficeLocation } from '@/state/types'
import ModalPrompt from '@/components/ModalPrompt'
import RichTextEditor from '@/components/RichTextEditor'

const STATUS_COLORS: Record<JobStatus, string> = {
  open: '#94a3b8',
  applied: '#fbbf24',
  rejected: '#ef4444',
  interview: '#f97316',
  accepted: '#10b981',
}

const STATUS_LABELS: Record<JobStatus, string> = {
  open: 'Open',
  applied: 'Applied',
  rejected: 'Rejected',
  interview: 'Interview',
  accepted: 'Accepted',
}

const OFFICE_OPTIONS: { value: OfficeLocation; label: string; icon: string }[] = [
  { value: 'on-site', label: 'On site', icon: '🏢' },
  { value: 'hybrid', label: 'Hybrid', icon: '🔀' },
  { value: 'remote', label: 'Remote', icon: '🏡' },
  { value: 'custom', label: 'Custom', icon: '✨' },
]

export default function JobDetailPage({ jobId, onBack }: { jobId: string | null; onBack: () => void }) {
  const { state, actions } = useAppState()
  const job = useMemo(() => state.jobs.find(j => j.id === jobId) || null, [state.jobs, jobId])
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showOfficeMenu, setShowOfficeMenu] = useState(false)
  const [showEditLink, setShowEditLink] = useState(false)
  const [fillError, setFillError] = useState<string | null>(null)
  const [fillSuccess, setFillSuccess] = useState(false)
  const statusBtnRef = useRef<HTMLButtonElement>(null)
  const officeBtnRef = useRef<HTMLButtonElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const officeMenuRef = useRef<HTMLDivElement>(null)
  const linkBtnRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const linkPopupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      const t = e.target as Element
      const clickedInStatus = !!(statusBtnRef.current && statusBtnRef.current.contains(t)) || !!(statusMenuRef.current && statusMenuRef.current.contains(t))
      const clickedInOffice = !!(officeBtnRef.current && officeBtnRef.current.contains(t)) || !!(officeMenuRef.current && officeMenuRef.current.contains(t))
      const clickedInLink = !!(linkBtnRef.current && linkBtnRef.current.contains(t)) || !!(linkPopupRef.current && linkPopupRef.current.contains(t))
      if (!clickedInStatus) setShowStatusMenu(false)
      if (!clickedInOffice) setShowOfficeMenu(false)
      if (!clickedInLink) setShowEditLink(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [])

  if (!job) {
    return (
      <div className="jobs-page">
        <h3 style={{ margin: 0, marginBottom: 12 }}>Job not found</h3>
        <p>It looks like this job was removed.</p>
      </div>
    )
  }

  const update = (patch: Partial<Job>) => actions.updateJob(job.id, { ...patch, updatedAt: Date.now() })

  const handleFillFromPage = async () => {
    setFillError(null)
    setFillSuccess(false)
    try {
      const data = await actions.extractJobDataFromPage()
      if (data && Object.keys(data).length > 0) {
        // Only update fields that were extracted
        const filteredData: Partial<Job> = {}
        if (data.title) filteredData.title = data.title
        if (data.company) filteredData.company = data.company
        if (data.location) filteredData.location = data.location
        if (data.description) filteredData.description = data.description
        if (data.recruiter) filteredData.recruiter = data.recruiter
        if (data.link) filteredData.link = data.link
        
        if (Object.keys(filteredData).length > 0) {
          update(filteredData)
          setFillSuccess(true)
          setTimeout(() => setFillSuccess(false), 3000)
        } else {
          setFillError('No job information found on this page')
        }
      } else {
        setFillError('No matching site rule for this page or no job data found')
      }
    } catch (e) {
      console.error('Failed to extract job data:', e)
      setFillError('Failed to extract job data from page')
    }
  }

  return (
    <div className="jobs-page">
      {/* Fill from page button - top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8, alignItems: 'center' }}>
        {fillSuccess && <span style={{ color: 'var(--success, #10b981)', fontSize: '14px' }}>✓ Filled from page</span>}
        {fillError && <span style={{ color: 'var(--danger, #ef4444)', fontSize: '14px' }}>{fillError}</span>}
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={handleFillFromPage}
          title="Extract job information from the current page"
        >
          📄 Fill from open page
        </button>
      </div>

      {/* Company */}
      <div style={{ marginBottom: 16 }}>
        <h6 style={{ margin: 0, marginBottom: 6, color: 'var(--text)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span title="Company">🏢</span> Company
        </h6>
        <input
          className="form-control"
          value={job.company}
          placeholder="Company name"
          onChange={(e) => update({ company: e.target.value })}
        />
      </div>

      {/* Location */}
      <div style={{ marginBottom: 16 }}>
        <h6 style={{ margin: 0, marginBottom: 6, color: 'var(--text)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span title="Location">📍</span> Office Location
        </h6>
        <input
          className="form-control"
          value={job.location}
          placeholder="City, Country"
          onChange={(e) => update({ location: e.target.value })}
        />
      </div>

      {/* Recruiter */}
      <div style={{ marginBottom: 16 }}>
        <h6 style={{ margin: 0, marginBottom: 6, color: 'var(--text)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span title="Recruiter">👤</span> Recruiter
        </h6>
        <input
          className="form-control"
          value={job.recruiter || ''}
          placeholder="Recruiter name"
          onChange={(e) => update({ recruiter: e.target.value })}
        />
      </div>

      {/* Office location, Link, and Status - in a flex row */}
      <div className="d-flex flex-wrap gap-2 align-items-start mb-3">
        {/* Office location */}
        <div className="d-flex align-items-center gap-2" style={{ position: 'relative' }}>
          <button
            ref={officeBtnRef}
            className="detail-btn"
            onClick={() => setShowOfficeMenu(v => !v)}
            title="Select office location"
          >
            <span style={{ marginRight: 4 }}>🧭</span>
            {OFFICE_OPTIONS.find(o => o.value === job.officeLocation)?.label || 'Office location'} ▾
          </button>
          {job.officeLocation === 'custom' && (
            <input
              className="form-control"
              style={{ maxWidth: 200 }}
              placeholder="Custom office location"
              value={job.officeLocationCustom || ''}
              onChange={(e) => update({ officeLocationCustom: e.target.value })}
            />
          )}
          {showOfficeMenu && officeBtnRef.current && (
            <div
              ref={officeMenuRef}
              style={{
                position: 'fixed',
                top: officeBtnRef.current.getBoundingClientRect().bottom + 6,
                left: officeBtnRef.current.getBoundingClientRect().left,
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: 200,
              }}
            >
              {OFFICE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className="context-menu-item office-menu-item"
                  onClick={() => { update({ officeLocation: opt.value }); setShowOfficeMenu(false) }}
                >
                  <span className="office-icon" style={{ fontSize: 16 }}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Link */}
        <div className="d-flex align-items-center gap-2">
          {job.link ? (
            <>
              <a
                ref={linkBtnRef as any}
                className="detail-btn"
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                title={job.link}
              >
                🌐 Open Link
              </a>
              <button ref={linkBtnRef as any} className="detail-btn" onClick={() => setShowEditLink(true)} title="Edit link">✏️ Edit</button>
            </>
          ) : (
            <button ref={linkBtnRef as any} className="detail-btn" onClick={() => setShowEditLink(true)} title="Add link">➕ Add Link</button>
          )}
          {showEditLink && linkBtnRef.current && (() => {
            const rect = linkBtnRef.current.getBoundingClientRect()
            let left = rect.left
            let top = rect.bottom + 6
            const popupW = 320
            const popupH = 120
            if (left + popupW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - popupW - 8)
            if (top + popupH > window.innerHeight - 8) top = Math.max(8, rect.top - popupH - 6)
            let temp = job.link || ''
            return (
              <div
                ref={linkPopupRef}
                style={{
                  position: 'fixed',
                  top,
                  left,
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: popupW,
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    defaultValue={job.link}
                    placeholder="https://..."
                    className="form-control"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.currentTarget as HTMLInputElement).value
                        update({ link: val }); setShowEditLink(false)
                      } else if (e.key === 'Escape') {
                        setShowEditLink(false)
                      }
                    }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    const input = (linkPopupRef.current?.querySelector('input') as HTMLInputElement)
                    const val = input?.value || ''
                    update({ link: val }); setShowEditLink(false)
                  }}>Save</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowEditLink(false)}>Cancel</button>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Status */}
        <div className="d-flex align-items-center gap-2">
          <button
            ref={statusBtnRef}
            className="job-status-badge"
            style={{ backgroundColor: STATUS_COLORS[job.status] }}
            onClick={() => setShowStatusMenu(v => !v)}
            title="Change status"
          >
            {STATUS_LABELS[job.status]} ▾
          </button>
          {showStatusMenu && statusBtnRef.current && (
            <div
              ref={statusMenuRef}
              style={{
                position: 'fixed',
                top: statusBtnRef.current.getBoundingClientRect().bottom + 6,
                left: statusBtnRef.current.getBoundingClientRect().left,
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: 200,
              }}
            >
              {Object.keys(STATUS_LABELS).map((k) => {
                const s = k as JobStatus
                return (
                  <button
                    key={s}
                    className="context-menu-item status-menu-item"
                    onClick={() => { update({ status: s }); setShowStatusMenu(false) }}
                  >
                    <span className="status-color-dot" style={{ background: STATUS_COLORS[s] }} />
                    <span>{STATUS_LABELS[s]}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <h6 style={{ margin: 0, color: 'var(--text)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span title="Description / Notes">📝</span> Description
        </h6>
        <RichTextEditor
          content={job.description || ''}
          onChange={(html) => update({ description: html })}
          placeholder="Job description / notes..."
          showToolbar={true}
        />
      </div>
    </div>
  )
}
