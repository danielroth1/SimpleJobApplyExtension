// Respond with page text when asked
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'SIMPLE_GET_PAGE_TEXT') {
    try {
      let text = ''
      // Attempt to get specific job description areas on popular sites
      const candidates = [
        '[data-test-id="job-description"]', // Indeed
        '.jobs-description__container', // LinkedIn
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
