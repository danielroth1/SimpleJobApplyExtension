import React from 'react'

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>Simple Job Apply Extension</h1>
        <p className="about-description">
          A browser extension to help analyze job postings and generate tailored cover letters.
        </p>

        <section className="about-section">
          <h2>Contact Information</h2>
          <div className="contact-links">
            <a href="https://www.linkedin.com/in/daniel-roth-114a22181/" target="_blank" rel="noopener noreferrer" className="contact-link">
              <span className="contact-icon">🔗</span>
              <span>LinkedIn Profile</span>
            </a>
            <a href="https://daniel.mailbase.info/" target="_blank" rel="noopener noreferrer" className="contact-link">
              <span className="contact-icon">🌐</span>
              <span>Personal Website</span>
            </a>
            <a href="mailto:daniel@mailbase.info" className="contact-link">
              <span className="contact-icon">✉️</span>
              <span>daniel@mailbase.info</span>
            </a>
            <a href="https://github.com/danielroth1/SimpleJobApplyExtension" target="_blank" rel="noopener noreferrer" className="contact-link">
              <span className="contact-icon">⚙️</span>
              <span>GitHub Repository</span>
            </a>
          </div>
        </section>

        <section className="about-section">
          <h2>Attribution</h2>
          <div className="attribution">
            <h3>Icon Attribution</h3>
            <p>
              <strong>Creator:</strong> IconMarket<br />
              <strong>License:</strong> <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC Attribution 4.0</a><br />
              <strong>Icon:</strong> <a href="https://icon-icons.com/icon/profession-professions-job-suit-businessman-jobs/255749" target="_blank" rel="noopener noreferrer">Businessman Job Icon</a><br />
              <strong>Icon Pack:</strong> <a href="https://icon-icons.com/pack/Avatar/4019" target="_blank" rel="noopener noreferrer">Avatar Icon Pack</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
