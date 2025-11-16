export type KeywordWithOptions = {
  text: string
  matchWholeWord: boolean
  matchCase: boolean
}

// Undo/Redo operation interface
export interface Operation {
  do(state: AppState): AppState
  undo(state: AppState): AppState
  description: string
}

export type Paragraph = {
  id: string
  html: string
  keywords: KeywordWithOptions[]
  noLineBreak: boolean
  autoInclude: boolean
  included: boolean
  collapsed: boolean
  // Optional explicit color for this paragraph (CSS color string). If undefined, UI may fall back to palette.
  color?: string
  // Flag to track if the color was manually picked by the user (vs auto-assigned)
  userPickedColor?: boolean
  lastMatchedKeywords?: string[]
}

export type JobStatus = 'open' | 'applied' | 'rejected' | 'interview' | 'accepted'

export type OfficeLocation = 'hybrid' | 'on-site' | 'remote' | 'custom'

export type JobLink = {
  id: string
  url: string
  previewText?: string
}

export type Job = {
  id: string
  title: string
  company: string
  location: string
  officeLocation: OfficeLocation
  officeLocationCustom?: string
  description: string
  link: string
  links?: JobLink[] // Multiple links support
  recruiter?: string
  externalId?: string // Job ID from external site (e.g., LinkedIn job ID from URL)
  status: JobStatus
  createdAt: number
  updatedAt: number
}

export type PDFItem = {
  id: string
  fileName: string
  dataUrl: string // Base64 encoded PDF or image for persistence
  type: 'pdf' | 'image' // Track file type
  // Compression settings for images
  imageCompressionEnabled?: boolean
  imageQuality?: number // 0.1 to 1.0
  maxWidth?: number
  maxHeight?: number
  // Compression settings for PDFs
  pdfCompressionEnabled?: boolean
  pdfCompressionLevel?: number // 0 to 3 (0 = none, 1 = low, 2 = medium, 3 = high)
}

export type SiteRule = {
  domain: string
  jobDescription?: string
  jobTitle?: string
  companyName?: string
  labels?: string
  jobPoster?: string
  description?: string
}

export type AppState = {
  paragraphs: Paragraph[]
  jobs: Job[]
  pdfItems: PDFItem[]
  jobPostingRaw: string
  jobPostingHTML: string
  coverLetterHTML: string
  jobEditorHidden: boolean
  darkMode: boolean
  highlightInCoverLetter: boolean
  autoAnalyze: boolean
  debugMode: boolean
  siteRules: SiteRule[]
  // Settings
  forceUniqueColors: boolean
  prefillNewJobs: boolean
  // Undo/Redo
  undoStack: Operation[]
  redoStack: Operation[]
  // Current job posting metadata
  currentRecruiterName?: string
}

export type AppActions = {
  addParagraph: () => void
  addParagraphAt: (index: number) => void
  updateParagraph: (paragraphId: string, patch: Partial<Paragraph> | ((prev: Paragraph) => Partial<Paragraph>)) => void
  deleteParagraph: (paragraphId: string) => void
  addKeyword: (paragraphId: string, keyword: string) => void
  updateKeyword: (paragraphId: string, oldText: string, updates: Partial<KeywordWithOptions>) => void
  removeKeyword: (paragraphId: string, keyword: string) => void
  moveKeyword: (paragraphId: string, fromIndex: number, toIndex: number) => void
  transferKeyword: (fromParagraphId: string, fromIndex: number, toParagraphId: string, toIndex?: number) => void
  setParagraphColor: (paragraphId: string, color?: string, userPicked?: boolean) => void
  reassignParagraphColors: () => void
  reorderParagraphs: (fromIndex: number, toIndex: number) => void
  // Job actions
  addJob: () => void
  addJobAndGetId: () => string
  updateJob: (jobId: string, patch: Partial<Job>) => void
  deleteJob: (jobId: string) => void
  reorderJobs: (fromIndex: number, toIndex: number) => void
  addJobLink: (jobId: string, url: string, previewText?: string) => void
  removeJobLink: (jobId: string, linkId: string) => void
  // PDF actions
  addPdfItem: (fileName: string, dataUrl: string, type: 'pdf' | 'image') => void
  updatePdfItem: (pdfId: string, updates: Partial<PDFItem>) => void
  deletePdfItem: (pdfId: string) => void
  reorderPdfItems: (fromIndex: number, toIndex: number) => void
  // Undo/Redo actions
  undo: () => void
  redo: () => void
  executeOperation: (operation: Operation) => void
  // Other actions
  setJobPostingRaw: (raw: string) => void
  analyzeNow: () => void
  generateCoverLetter: () => void
  saveToFile: (filename?: string) => Promise<void>
  loadFromFile: (file: File) => Promise<void>
  pasteFromClipboard: () => Promise<void>
  analyzeCurrentPage: () => Promise<void>
  downloadCurrentPageHtml: () => Promise<void>
  toggleDarkMode: () => void
  toggleHighlightInCoverLetter: () => void
  toggleAutoAnalyze: () => void
  toggleDebugMode: () => void
  toggleForceUniqueColors: () => void
  togglePrefillNewJobs: () => void
  highlightPageKeywords: () => Promise<void>
  debugPageState: () => Promise<void>
  addSiteRule: (rule: SiteRule) => void
  updateSiteRule: (domain: string, updates: Partial<SiteRule>) => void
  removeSiteRule: (domain: string) => void
  loadSiteRulesFromFile: (file: File) => Promise<void>
  saveSiteRulesToFile: (filename?: string) => Promise<void>
  extractJobDataFromPage: () => Promise<Partial<Job> | null>
  extractJobIdFromUrl: () => Promise<string | null>
}

