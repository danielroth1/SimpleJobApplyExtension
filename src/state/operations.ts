import { AppState, Operation, Paragraph, KeywordWithOptions, JobLink } from './types'
import { cloneState } from './logic'

function uuid(): string { return Math.random().toString(36).slice(2) }

// Create Paragraph Operation
export class CreateParagraphOperation implements Operation {
  description: string
  private paragraphId: string
  private index: number
  private paragraph: Paragraph

  constructor(index: number, paragraph?: Paragraph) {
    this.index = index
    this.paragraphId = paragraph?.id || uuid()
    this.paragraph = paragraph || {
      id: this.paragraphId,
      html: '<p></p>',
      keywords: [],
      noLineBreak: false,
      autoInclude: false,
      included: false,
      collapsed: false,
      color: undefined
    }
    this.description = `Create paragraph at index ${index}`
  }

  public do(state: AppState): AppState {
    const next = cloneState(state)
    next.paragraphs.splice(this.index, 0, { ...this.paragraph })
    return next
  }

  public undo(state: AppState): AppState {
    const next = cloneState(state)
    const idx = next.paragraphs.findIndex(p => p.id === this.paragraphId)
    if (idx !== -1) {
      next.paragraphs.splice(idx, 1)
    }
    return next
  }
}

// Remove Paragraph Operation
export class RemoveParagraphOperation implements Operation {
  description: string
  private paragraphId: string
  private paragraph: Paragraph | null = null
  private index: number = -1

  constructor(paragraphId: string) {
    this.paragraphId = paragraphId
    this.description = `Remove paragraph ${paragraphId}`
  }

  do(state: AppState): AppState {
    const next = cloneState(state)
    const idx = next.paragraphs.findIndex(p => p.id === this.paragraphId)
    if (idx !== -1) {
      this.index = idx
      this.paragraph = next.paragraphs[idx]
      next.paragraphs.splice(idx, 1)
    }
    return next
  }

  undo(state: AppState): AppState {
    if (!this.paragraph || this.index === -1) return state
    const next = cloneState(state)
    next.paragraphs.splice(this.index, 0, { ...this.paragraph })
    return next
  }
}

// Reorder Paragraphs Operation
export class ReorderParagraphsOperation implements Operation {
  description: string
  private fromIndex: number
  private toIndex: number

  constructor(fromIndex: number, toIndex: number) {
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.description = `Reorder paragraph from ${fromIndex} to ${toIndex}`
  }

  do(state: AppState): AppState {
    const next = cloneState(state)
    const [moved] = next.paragraphs.splice(this.fromIndex, 1)
    next.paragraphs.splice(this.toIndex, 0, moved)
    return next
  }

  undo(state: AppState): AppState {
    const next = cloneState(state)
    const [moved] = next.paragraphs.splice(this.toIndex, 1)
    next.paragraphs.splice(this.fromIndex, 0, moved)
    return next
  }
}

// Add Keyword Operation
export class AddKeywordOperation implements Operation {
  description: string
  private paragraphId: string
  private keyword: KeywordWithOptions

  constructor(paragraphId: string, keyword: string | KeywordWithOptions) {
    this.paragraphId = paragraphId
    this.keyword = typeof keyword === 'string' 
      ? { text: keyword, matchWholeWord: false, matchCase: false }
      : keyword
    this.description = `Add keyword "${this.keyword.text}" to paragraph`
  }

  do(state: AppState): AppState {
    const next = cloneState(state)
    const p = next.paragraphs.find(p => p.id === this.paragraphId)
    if (p && !p.keywords.some(k => k.text === this.keyword.text)) {
      p.keywords.push({ ...this.keyword })
    }
    return next
  }

  undo(state: AppState): AppState {
    const next = cloneState(state)
    const p = next.paragraphs.find(p => p.id === this.paragraphId)
    if (p) {
      p.keywords = p.keywords.filter(k => k.text !== this.keyword.text)
      if (p.keywords.length === 0 && !p.userPickedColor) {
        p.color = undefined
      }
    }
    return next
  }
}

// Remove Keyword Operation
export class RemoveKeywordOperation implements Operation {
  description: string
  private paragraphId: string
  private keyword: KeywordWithOptions | null = null
  private index: number = -1

  constructor(paragraphId: string, keywordText: string) {
    this.paragraphId = paragraphId
    this.description = `Remove keyword "${keywordText}" from paragraph`
    // Store keyword text for later retrieval
    this.keyword = { text: keywordText, matchWholeWord: false, matchCase: false }
  }

  do(state: AppState): AppState {
    const next = cloneState(state)
    const p = next.paragraphs.find(p => p.id === this.paragraphId)
    if (p) {
      const idx = p.keywords.findIndex(k => k.text === this.keyword!.text)
      if (idx !== -1) {
        this.index = idx
        this.keyword = p.keywords[idx]
        p.keywords.splice(idx, 1)
        if (p.keywords.length === 0 && !p.userPickedColor) {
          p.color = undefined
        }
      }
    }
    return next
  }

  undo(state: AppState): AppState {
    if (!this.keyword || this.index === -1) return state
    const next = cloneState(state)
    const p = next.paragraphs.find(p => p.id === this.paragraphId)
    if (p) {
      p.keywords.splice(this.index, 0, { ...this.keyword })
    }
    return next
  }
}

// Add Job Link Operation
export class AddJobLinkOperation implements Operation {
  description: string
  private jobId: string
  private linkId: string
  private url: string
  private previewText?: string

  constructor(jobId: string, url: string, previewText?: string) {
    this.jobId = jobId
    this.linkId = uuid()
    this.url = url
    this.previewText = previewText
    this.description = `Add link to job`
  }

  do(state: AppState): AppState {
    const next = cloneState(state)
    const job = next.jobs.find(j => j.id === this.jobId)
    if (job) {
      if (!job.links) job.links = []
      job.links.push({ id: this.linkId, url: this.url, previewText: this.previewText })
      job.updatedAt = Date.now()
    }
    return next
  }

  undo(state: AppState): AppState {
    const next = cloneState(state)
    const job = next.jobs.find(j => j.id === this.jobId)
    if (job && job.links) {
      job.links = job.links.filter(l => l.id !== this.linkId)
      job.updatedAt = Date.now()
    }
    return next
  }
}

// Remove Job Link Operation
export class RemoveJobLinkOperation implements Operation {
  description: string
  private jobId: string
  private linkId: string
  private link: JobLink | null = null
  private index: number = -1

  constructor(jobId: string, linkId: string) {
    this.jobId = jobId
    this.linkId = linkId
    this.description = `Remove link from job`
  }

  do(state: AppState): AppState {
    const next = cloneState(state)
    const job = next.jobs.find(j => j.id === this.jobId)
    if (job && job.links) {
      const idx = job.links.findIndex(l => l.id === this.linkId)
      if (idx !== -1) {
        this.index = idx
        this.link = job.links[idx]
        job.links.splice(idx, 1)
        job.updatedAt = Date.now()
      }
    }
    return next
  }

  undo(state: AppState): AppState {
    if (!this.link || this.index === -1) return state
    const next = cloneState(state)
    const job = next.jobs.find(j => j.id === this.jobId)
    if (job) {
      if (!job.links) job.links = []
      job.links.splice(this.index, 0, { ...this.link })
      job.updatedAt = Date.now()
    }
    return next
  }
}
