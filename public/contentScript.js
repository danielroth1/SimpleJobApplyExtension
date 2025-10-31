// Respond with page text when asked
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'SIMPLE_GET_PAGE_TEXT') {
    try {
      let text = ''
      // Site-specific extraction rules
      const siteRules = {
        'linkedin.com': 'article.jobs-description__container',
        'indeed.com': '[data-test-id="job-description"]',
      }
      
      // Check if we're on a site with specific rules
      const hostname = window.location.hostname
      for (const [domain, selector] of Object.entries(siteRules)) {
        if (hostname.includes(domain)) {
          const el = document.querySelector(selector)
          if (el && el.innerText && el.innerText.length > 100) {
            text = el.innerText
            sendResponse({ ok: true, text })
            return true
          }
        }
      }
      
      // Fallback: try common job description containers
      const candidates = [
        'article.jobs-description__container', // LinkedIn
        '[data-test-id="job-description"]', // Indeed
        '.jobs-description', // LinkedIn alt
        'article',
        'main',
        'body'
      ]
      for (const sel of candidates) {
        const el = document.querySelector(sel)
        if (el && el.innerText && el.innerText.length > 200) { text = el.innerText; break }
      }
      if (!text) text = document.body?.innerText || ''
      sendResponse({ ok: true, text })
    } catch (e) {
      sendResponse({ ok: false, text: document.body?.innerText || '' })
    }
    return true
  }
})
