import React, { useEffect, useRef, useState } from 'react'
import { JobStatus } from '@/state/types'

const STATUS_COLORS: Record<JobStatus, string> = {
  open: '#94a3b8',
  applied: '#fbbf24',
  rejected: '#ef4444',
  interview: '#f97316',
  accepted: '#10b981',
  withdrawn: '#38bdf8',
}

const STATUS_LABELS: Record<JobStatus, string> = {
  open: 'Open',
  applied: 'Applied',
  rejected: 'Rejected',
  interview: 'Interview',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
}

export function JobStatusBadge({
  status,
  onChange,
  clickable = true,
}: {
  status: JobStatus
  onChange?: (status: JobStatus) => void
  clickable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Element
      const inBtn = btnRef.current && btnRef.current.contains(t)
      const inMenu = menuRef.current && menuRef.current.contains(t)
      if (!inBtn && !inMenu) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!clickable || !onChange) return
    
    // Calculate position before opening to avoid flash at (0,0)
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left
      })
    }
    
    setOpen(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        className="job-status-badge"
        style={{ backgroundColor: STATUS_COLORS[status] }}
        onClick={handleClick}
        title={clickable ? 'Change status' : `Status: ${STATUS_LABELS[status]}`}
      >
        {STATUS_LABELS[status]}{clickable ? ' ▾' : ''}
      </button>
      {open && btnRef.current && onChange && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 200,
          }}
          onClick={e => e.stopPropagation()}
        >
          {Object.keys(STATUS_LABELS).map(k => {
            const s = k as JobStatus
            return (
              <button
                key={s}
                className="context-menu-item status-menu-item"
                onClick={() => { onChange(s); setOpen(false) }}
              >
                <span className="status-color-dot" style={{ background: STATUS_COLORS[s] }} />
                <span>{STATUS_LABELS[s]}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export { STATUS_COLORS, STATUS_LABELS }
