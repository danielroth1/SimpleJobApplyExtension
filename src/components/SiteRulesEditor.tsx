import React, { useRef, useState, useEffect } from 'react'
import { useAppState } from '@/state/AppStateContext'
import { SiteRule } from '@/state/types'

export default function SiteRulesEditor({ onClose }: { onClose: () => void }) {
  const { state, actions } = useAppState()
  const [editingDomain, setEditingDomain] = useState<string | null>(null)
  const [newRule, setNewRule] = useState<Partial<SiteRule>>({ domain: '', selector: '', description: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFilename, setSaveFilename] = useState('site-rules')
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const saveDialogRef = useRef<HTMLDivElement>(null)

  const handleAddRule = () => {
    if (newRule.domain && newRule.selector) {
      actions.addSiteRule({
        domain: newRule.domain,
        selector: newRule.selector,
        description: newRule.description || undefined,
      })
      setNewRule({ domain: '', selector: '', description: '' })
    }
  }

  const handleSaveEdit = (domain: string) => {
    const rule = state.siteRules.find(r => r.domain === domain)
    if (rule) {
      setEditingDomain(null)
    }
  }

  const handleSave = () => {
    setShowSaveDialog(true)
  }

  const handleSaveConfirm = async () => {
    await actions.saveSiteRulesToFile(saveFilename + '.json')
    setShowSaveDialog(false)
  }

  // Close save dialog when clicking outside
  useEffect(() => {
    if (showSaveDialog) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Element
        if (saveDialogRef.current && !saveDialogRef.current.contains(target) && 
            saveButtonRef.current && !saveButtonRef.current.contains(target)) {
          setShowSaveDialog(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSaveDialog])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--panel-bg)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '20px' }}>Site Rules</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--text)',
            padding: '0',
            width: '32px',
            height: '32px',
          }}>×</button>
        </div>

        <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--muted)' }}>
          Site rules define CSS selectors for extracting job postings from specific domains.
        </div>

        {/* Rule list */}
        <div style={{ marginBottom: '24px' }}>
          {state.siteRules.map(rule => (
            <div key={rule.domain} style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
              background: 'var(--input-bg)',
            }}>
              {editingDomain === rule.domain ? (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>Domain</label>
                    <input
                      type="text"
                      value={rule.domain}
                      disabled
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--panel-bg)',
                        color: 'var(--muted)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>Selector</label>
                    <input
                      type="text"
                      value={rule.selector}
                      onChange={(e) => actions.updateSiteRule(rule.domain, { selector: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>Description (optional)</label>
                    <input
                      type="text"
                      value={rule.description || ''}
                      onChange={(e) => actions.updateSiteRule(rule.domain, { description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleSaveEdit(rule.domain)} style={{
                      padding: '6px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      background: 'var(--primary)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}>Save</button>
                    <button onClick={() => setEditingDomain(null)} style={{
                      padding: '6px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                        {rule.domain}
                      </div>
                      {rule.description && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                          {rule.description}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--muted)' }}>
                        {rule.selector}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                      <button onClick={() => setEditingDomain(rule.domain)} style={{
                        padding: '4px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}>Edit</button>
                      <button onClick={() => actions.removeSiteRule(rule.domain)} style={{
                        padding: '4px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        background: 'var(--input-bg)',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new rule */}
        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text)' }}>Add New Rule</h3>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>Domain</label>
            <input
              type="text"
              placeholder="e.g. linkedin.com"
              value={newRule.domain}
              onChange={(e) => setNewRule({ ...newRule, domain: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '13px',
              }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>CSS Selector</label>
            <input
              type="text"
              placeholder="e.g. article.jobs-description__container"
              value={newRule.selector}
              onChange={(e) => setNewRule({ ...newRule, selector: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '13px',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text)' }}>Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. LinkedIn job postings"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '13px',
              }}
            />
          </div>
          <button onClick={handleAddRule} disabled={!newRule.domain || !newRule.selector} style={{
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            background: newRule.domain && newRule.selector ? 'var(--primary)' : 'var(--muted)',
            color: 'white',
            cursor: newRule.domain && newRule.selector ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: '600',
          }}>Add Rule</button>
        </div>

        {/* Load/Save buttons */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => fileRef.current?.click()} style={{
            flex: 1,
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            background: 'var(--input-bg)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '13px',
          }}>📂 Load from File</button>
          <button 
            ref={saveButtonRef}
            onClick={handleSave} 
            style={{
              flex: 1,
              padding: '8px 16px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            💾 Save to File
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) actions.loadSiteRulesFromFile(f)
            e.currentTarget.value = ''
          }}
        />

        {/* Save dialog */}
        {showSaveDialog && saveButtonRef.current && (() => {
          const rect = saveButtonRef.current.getBoundingClientRect()
          let left = rect.right + 8
          let top = rect.top
          const dialogW = 300
          const dialogH = 140
          
          // Ensure dialog stays in viewport
          if (left + dialogW > window.innerWidth - 8) {
            left = Math.max(8, rect.left - dialogW - 8)
          }
          if (top + dialogH > window.innerHeight - 8) {
            top = Math.max(8, window.innerHeight - dialogH - 8)
          }

          return (
            <div
              ref={saveDialogRef}
              style={{
                position: 'fixed',
                top,
                left,
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10001,
                minWidth: dialogW,
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
                Save File
              </div>
              <input
                autoFocus
                type="text"
                value={saveFilename}
                onChange={(e) => setSaveFilename(e.target.value)}
                placeholder="filename"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveConfirm()
                  } else if (e.key === 'Escape') {
                    setShowSaveDialog(false)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  marginBottom: '12px',
                }}
              />
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                .json extension will be added automatically
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowSaveDialog(false)}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveConfirm}
                  className="btn btn-primary btn-sm"
                >
                  Save
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
