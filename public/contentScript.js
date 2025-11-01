// Track current URL for auto-analyze
let lastUrl = window.location.href

// Check for URL changes (for SPAs like LinkedIn)
setInterval(() => {
  const currentUrl = window.location.href
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl
    console.log('[ContentScript] URL changed to:', currentUrl)
    // Notify extension that URL changed
    try {
      chrome.runtime.sendMessage({ type: 'URL_CHANGED', url: currentUrl }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('[ContentScript] Message send error (expected if background not ready):', chrome.runtime.lastError.message)
        }
      })
    } catch (e) {
      console.log('[ContentScript] Failed to send URL_CHANGED:', e)
    }
  }
}, 1000)

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
  
  if (msg?.type === 'SIMPLE_HIGHLIGHT_KEYWORDS') {
    try {
      const keywords = msg.keywords || {}
      
      // Remove existing highlights first
      document.querySelectorAll('.simple-job-highlight').forEach(el => {
        const parent = el.parentNode
        parent.replaceChild(document.createTextNode(el.textContent), el)
        parent.normalize()
      })
      
      // Get the job description container
      const hostname = window.location.hostname
      let container = document.body
      
      if (hostname.includes('linkedin.com')) {
        const linkedInContainer = document.querySelector('article.jobs-description__container')
        if (linkedInContainer) container = linkedInContainer
      } else if (hostname.includes('indeed.com')) {
        const indeedContainer = document.querySelector('[data-test-id="job-description"]')
        if (indeedContainer) container = indeedContainer
      }
      
      // Highlight keywords
      highlightKeywordsInElement(container, keywords)
      
      sendResponse({ ok: true })
    } catch (e) {
      console.error('Highlight error:', e)
      sendResponse({ ok: false, error: e.message })
    }
    return true
  }
})

function highlightKeywordsInElement(element, keywordColorMap) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip if parent already has highlight class or is a script/style
        if (node.parentElement.classList?.contains('simple-job-highlight')) return NodeFilter.FILTER_REJECT
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )
  
  const textNodes = []
  let node
  while (node = walker.nextNode()) {
    textNodes.push(node)
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.textContent
    if (!text || text.trim().length === 0) return
    
    const textLower = text.toLowerCase()
    const matches = []
    
    // Find all keyword matches
    Object.entries(keywordColorMap).forEach(([keyword, color]) => {
      let idx = 0
      while (true) {
        idx = textLower.indexOf(keyword, idx)
        if (idx === -1) break
        matches.push({ start: idx, end: idx + keyword.length, color })
        idx += keyword.length
      }
    })
    
    if (matches.length === 0) return
    
    // Sort and merge overlapping
    matches.sort((a, b) => a.start - b.start || b.end - a.end)
    const merged = []
    let lastEnd = -1
    for (const m of matches) {
      if (m.start >= lastEnd) {
        merged.push(m)
        lastEnd = m.end
      }
    }
    
    // Build replacement nodes
    const fragment = document.createDocumentFragment()
    let cursor = 0
    
    merged.forEach(m => {
      // Add text before match
      if (cursor < m.start) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, m.start)))
      }
      // Add highlighted match
      const span = document.createElement('span')
      span.className = 'simple-job-highlight'
      span.style.background = m.color
      span.textContent = text.slice(m.start, m.end)
      fragment.appendChild(span)
      cursor = m.end
    })
    
    // Add remaining text
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)))
    }
    
    textNode.parentNode.replaceChild(fragment, textNode)
  })
}
