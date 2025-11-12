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

// Helper function to safely query selectors with retries
async function findElementWithRetry(selector, maxRetries = 10, delay = 300) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const el = document.querySelector(selector)
      if (el && el.innerText && el.innerText.length > 100) {
        console.log(`[ContentScript] ✓ Found element '${selector}' with ${el.innerText.length} chars on attempt ${i + 1}`)
        return el
      } else if (el) {
        console.log(`[ContentScript] ⚠ Element '${selector}' exists but only ${el.innerText?.length || 0} chars (need >100)`)
      } else {
        console.log(`[ContentScript] ✗ Element '${selector}' not found, attempt ${i + 1}/${maxRetries}`)
      }
    } catch (e) {
      console.warn('[ContentScript] Query error for selector:', selector, e)
    }
    // Wait before retrying (useful for SPAs)
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  console.warn(`[ContentScript] ❌ Failed to find element '${selector}' after ${maxRetries} attempts`)
  return null
}

// Wait for LinkedIn to finish rendering after SPA navigation
// LinkedIn shows skeleton/placeholder content before the real job description loads
async function waitForLinkedInJobToLoad(maxWait = 10000) {
  const startTime = Date.now()
  console.log('[ContentScript] Waiting for LinkedIn job content to load...')
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      // Check multiple indicators that content is loaded
      const jobContainer = document.querySelector('article.jobs-description__container')
      const hasContent = jobContainer && jobContainer.innerText && jobContainer.innerText.length > 100
      const bodyHasContent = document.body && document.body.innerText && document.body.innerText.length > 1000
      
      if (hasContent) {
        console.log(`[ContentScript] ✓ LinkedIn job loaded after ${elapsed}ms`)
        clearInterval(checkInterval)
        resolve(true)
      } else if (elapsed > maxWait) {
        console.warn(`[ContentScript] ⚠ Timeout waiting for LinkedIn job (${elapsed}ms)`)
        clearInterval(checkInterval)
        resolve(false)
      } else {
        console.log(`[ContentScript] Still waiting... (${elapsed}ms, body: ${document.body?.innerText?.length || 0} chars)`)
      }
    }, 200) // Check every 200ms
  })
}

// Debug function to inspect current page state
function debugPageState(siteRules) {
  const rules = siteRules || {
    'linkedin.com': 'article.jobs-description__container',
    'indeed.com': '[data-test-id="job-description"]',
  }
  
  console.log('=== PAGE DEBUG INFO ===')
  console.log('URL:', window.location.href)
  console.log('Hostname:', window.location.hostname)
  
  // Check site-specific selectors
  const hostname = window.location.hostname
  for (const [domain, selector] of Object.entries(rules)) {
    if (hostname.includes(domain)) {
      console.log(`\n📍 Checking site-specific selector: ${selector}`)
      try {
        const el = document.querySelector(selector)
        if (el) {
          console.log('  ✓ Element EXISTS')
          console.log('  - innerText length:', el.innerText?.length || 0)
          console.log('  - innerHTML length:', el.innerHTML?.length || 0)
          console.log('  - First 200 chars:', el.innerText?.substring(0, 200))
        } else {
          console.log('  ✗ Element NOT FOUND')
        }
      } catch (e) {
        console.log('  ❌ Error querying:', e.message)
      }
    }
  }
  
  // Check fallback candidates
  console.log('\n📋 Checking fallback candidates:')
  const candidates = [
    'article.jobs-description__container',
    '[data-test-id="job-description"]',
    '.jobs-description',
    'article',
    'main',
    'body'
  ]
  
  candidates.forEach(sel => {
    try {
      const el = document.querySelector(sel)
      if (el) {
        console.log(`  ✓ ${sel}: ${el.innerText?.length || 0} chars`)
      } else {
        console.log(`  ✗ ${sel}: not found`)
      }
    } catch (e) {
      console.log(`  ❌ ${sel}: error - ${e.message}`)
    }
  })
  
  console.log('\n=== END DEBUG ===')
}

// Expose debug function globally for console access
window.debugJobExtension = debugPageState

// Respond with page text when asked
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'EXTRACT_JOB_DATA') {
    // Extract job data based on site rules
    (async () => {
      try {
        const siteRule = msg.siteRule
        if (!siteRule) {
          sendResponse(null)
          return
        }
        
        const jobData = {}
        
        // Extract job title
        if (siteRule.jobTitle) {
          const titleEl = document.querySelector(siteRule.jobTitle)
          if (titleEl) {
            jobData.title = titleEl.innerText?.trim()
          }
        }
        
        // Extract company name
        if (siteRule.companyName) {
          const companyEl = document.querySelector(siteRule.companyName)
          if (companyEl) {
            jobData.company = companyEl.innerText?.trim()
          }
        }
        
        // Extract labels (location type indicators like "hybrid", "remote", etc.)
        if (siteRule.labels) {
          const labelsEl = document.querySelector(siteRule.labels)
          if (labelsEl) {
            const labelsText = labelsEl.innerText?.trim()
            if (labelsText) {
              // Extract location type from labels text
              const lowerText = labelsText.toLowerCase()
              if (lowerText.includes('hybrid')) {
                jobData.location = 'Hybrid'
              } else if (lowerText.includes('remote')) {
                jobData.location = 'Remote'
              } else if (lowerText.includes('on site') || lowerText.includes('on-site') || lowerText.includes('vor ort')) {
                jobData.location = 'On site'
              } else {
                // If no match, use the raw text
                jobData.location = labelsText
              }
            }
          }
        }
        
        // Extract job description
        if (siteRule.jobDescription) {
          // Wait for content to load if LinkedIn
          if (siteRule.domain === 'linkedin.com') {
            await waitForLinkedInJobToLoad()
          }
          const descEl = await findElementWithRetry(siteRule.jobDescription)
          if (descEl) {
            jobData.description = descEl.innerHTML
          }
        }
        
        // Extract job poster (recruiter)
        if (siteRule.jobPoster) {
          const posterEl = document.querySelector(siteRule.jobPoster)
          if (posterEl) {
            jobData.recruiter = posterEl.innerText?.trim()
          }
        }
        
        // Add current page URL as link
        jobData.link = window.location.href
        
        sendResponse(jobData)
      } catch (e) {
        console.error('[ContentScript] Extract error:', e)
        sendResponse(null)
      }
    })()
    return true
  }

  if (msg?.type === 'SIMPLE_GET_PAGE_TEXT') {
    // Use async IIFE to handle async operations
    (async () => {
      try {
        let text = ''
        // Site-specific extraction rules (from extension state or fallback)
        const siteRules = msg.siteRules || [];
      
        // Check if we're on a site with specific rules
        const hostname = window.location.hostname
        for (const rule of siteRules) {
          if (hostname.includes(rule.domain)) {
            // Special handling for LinkedIn: wait for content to load after SPA navigation
            if (rule.domain === 'linkedin.com') {
              console.log('[ContentScript] LinkedIn detected, waiting for job to load...')
              await waitForLinkedInJobToLoad()
            }
            const el = await findElementWithRetry(rule.selector)
            if (el) {
              text = el.innerText
              sendResponse({ ok: true, text })
              return
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
          try {
            const el = document.querySelector(sel)
            if (el && el.innerText && el.innerText.length > 200) { 
              text = el.innerText
              break
            }
          } catch (e) {
            console.warn('[ContentScript] Invalid selector in fallback:', sel, e)
          }
        }
        if (!text) text = document.body?.innerText || ''
        sendResponse({ ok: true, text })
      } catch (e) {
        sendResponse({ ok: false, text: document.body?.innerText || '' })
      }
    })()
    return true
  }

  if (msg?.type === 'SIMPLE_GET_PAGE_HTML') {
    try {
      const html = document.documentElement?.outerHTML || document.documentElement?.innerHTML || document.body?.innerHTML || ''
      sendResponse({ ok: true, html })
    } catch (e) {
      sendResponse({ ok: false, html: '' })
    }
    return true
  }
  
  if (msg?.type === 'SIMPLE_HIGHLIGHT_KEYWORDS') {
    try {
      const keywords = msg.keywords || {}
      const siteRules = msg.siteRules || []
      
      // Remove existing highlights first
      document.querySelectorAll('.simple-job-highlight').forEach(el => {
        const parent = el.parentNode
        parent.replaceChild(document.createTextNode(el.textContent), el)
        parent.normalize()
      })
      
      // Get the job description container
      const hostname = window.location.hostname
      let container = document.body
      
      for (const rule of siteRules) {
        if (hostname.includes(rule.domain)) {
          const siteContainer = document.querySelector(rule.selector)
          if (siteContainer) {
            container = siteContainer
            break
          }
        }
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
  
  if (msg?.type === 'DEBUG_PAGE_STATE') {
    debugPageState(msg.siteRules)
    sendResponse({ ok: true })
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
    
    const matches = []
    
    // Find all keyword matches with options
    Object.entries(keywordColorMap).forEach(([keywordJson, color]) => {
      let kw
      try {
        kw = JSON.parse(keywordJson)
      } catch (e) {
        // Fallback for old format (simple string)
        kw = { text: keywordJson, matchWholeWord: false, matchCase: false }
      }
      
      const searchText = kw.matchCase ? text : text.toLowerCase()
      const searchKeyword = kw.matchCase ? kw.text : kw.text.toLowerCase()
      
      let idx = 0
      while (true) {
        idx = searchText.indexOf(searchKeyword, idx)
        if (idx === -1) break
        
        // Check whole word match if required
        let isMatch = true
        if (kw.matchWholeWord) {
          const before = idx > 0 ? text[idx - 1] : ' '
          const after = idx + kw.text.length < text.length ? text[idx + kw.text.length] : ' '
          const isWordBoundary = (c) => /[\s\W]/.test(c)
          
          if (!isWordBoundary(before) || !isWordBoundary(after)) {
            isMatch = false
          }
        }
        
        if (isMatch) {
          matches.push({ start: idx, end: idx + kw.text.length, color })
        }
        
        idx += 1
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
