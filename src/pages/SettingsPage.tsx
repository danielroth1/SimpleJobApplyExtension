import React from 'react'
import { useAppState } from '@/state/AppStateContext'

export default function SettingsPage() {
  const { state, actions } = useAppState()

  return (
    <div className="jobs-page" style={{ padding: '20px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text)' }}>Settings</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Prefill New Jobs */}
        <div className="setting-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="prefill-new-jobs"
              checked={state.prefillNewJobs}
              onChange={() => actions.togglePrefillNewJobs()}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="prefill-new-jobs" 
              style={{ 
                cursor: 'pointer', 
                fontWeight: '500', 
                color: 'var(--text)',
                fontSize: '15px'
              }}
            >
              Prefill new jobs
            </label>
          </div>
          <p style={{ 
            margin: 0, 
            marginLeft: '30px',
            fontSize: '13px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            When adding a new job, try to prefill its content based on the open page using site rules
          </p>
        </div>

        {/* Highlight in Cover Letter */}
        <div className="setting-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="highlight-cover-letter"
              checked={state.highlightInCoverLetter}
              onChange={() => actions.toggleHighlightInCoverLetter()}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="highlight-cover-letter" 
              style={{ 
                cursor: 'pointer', 
                fontWeight: '500', 
                color: 'var(--text)',
                fontSize: '15px'
              }}
            >
              Highlight in cover letter
            </label>
          </div>
          <p style={{ 
            margin: 0, 
            marginLeft: '30px',
            fontSize: '13px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            Highlight matched keywords in the generated cover letter
          </p>
        </div>

        {/* Auto-analyze */}
        <div className="setting-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="auto-analyze"
              checked={state.autoAnalyze}
              onChange={() => actions.toggleAutoAnalyze()}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="auto-analyze" 
              style={{ 
                cursor: 'pointer', 
                fontWeight: '500', 
                color: 'var(--text)',
                fontSize: '15px'
              }}
            >
              Auto-analyze
            </label>
          </div>
          <p style={{ 
            margin: 0, 
            marginLeft: '30px',
            fontSize: '13px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            Automatically analyze job postings and match keywords
          </p>
        </div>

        {/* Force Unique Colors */}
        <div className="setting-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="force-unique-colors"
              checked={state.forceUniqueColors}
              onChange={() => actions.toggleForceUniqueColors()}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="force-unique-colors" 
              style={{ 
                cursor: 'pointer', 
                fontWeight: '500', 
                color: 'var(--text)',
                fontSize: '15px'
              }}
            >
              Force unique colors
            </label>
          </div>
          <p style={{ 
            margin: 0, 
            marginLeft: '30px',
            fontSize: '13px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            Ensure each paragraph has a unique color for better distinction
          </p>
        </div>

        {/* Dark Mode */}
        <div className="setting-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="dark-mode"
              checked={state.darkMode}
              onChange={() => actions.toggleDarkMode()}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="dark-mode" 
              style={{ 
                cursor: 'pointer', 
                fontWeight: '500', 
                color: 'var(--text)',
                fontSize: '15px'
              }}
            >
              Dark mode
            </label>
          </div>
          <p style={{ 
            margin: 0, 
            marginLeft: '30px',
            fontSize: '13px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            Use dark theme for the interface
          </p>
        </div>

        {/* Debug Mode */}
        <div className="setting-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="debug-mode"
              checked={state.debugMode}
              onChange={() => actions.toggleDebugMode()}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label 
              htmlFor="debug-mode" 
              style={{ 
                cursor: 'pointer', 
                fontWeight: '500', 
                color: 'var(--text)',
                fontSize: '15px'
              }}
            >
              Debug mode
            </label>
          </div>
          <p style={{ 
            margin: 0, 
            marginLeft: '30px',
            fontSize: '13px', 
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>
            Show additional debugging information and tools
          </p>
        </div>

      </div>
    </div>
  )
}
