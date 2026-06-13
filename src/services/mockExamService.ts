import api from './api'

export type SectionType = 
  | 'listening'           // 听力（一个音频 + 多个选择题）
  | 'reading_cloze'       // 选词填空（一篇文章 + 10个空）
  | 'reading_matching'    // 段落匹配（一篇文章 + 10个匹配项）
  | 'reading_careful'     // 仔细阅读（一篇文章 + 5个选择题）
  | 'translation'         // 翻译
  | 'writing'             // 写作

export type ExamCategory = 'real' | 'mock'
export type ExamLevel = 'cet4' | 'cet6' | 'ky1' | 'ky2'

export const levelLabels: Record<ExamLevel, string> = {
  cet4: '四级', cet6: '六级', ky1: '考研英语一', ky2: '考研英语二'
}

export const categoryLabels: Record<ExamCategory, string> = {
  real: '真题', mock: '模拟卷'
}

export interface SubQuestion {
  id: string
  title?: string
  score: number
  answer: string
  options?: { label: string; value: string }[]
}

export interface Section {
  id: string
  type: SectionType
  title: string
  partLabel?: string
  partTitle?: string
  directions?: string
  audioUrl?: string
  passageTitle?: string
  passage?: string
  paragraphs?: string[]
  wordBank?: string[]
  requirements?: string
  questions: SubQuestion[]
}

export interface MockExam {
  id: string
  title: string
  description: string
  level: ExamLevel
  category: ExamCategory
  duration: number
  enabled: boolean
  sections: Section[]
  participationStatus?: string
  score?: number
  maxScore?: number
  participationId?: string
  startedAt?: string
  completedAt?: string
  createdAt?: string
}

export interface MockExamStats {
  total: number
  completed: number
  avgScore: number
  passRate: number
}

export interface MockExamListResponse {
  exams: MockExam[]
  total: number
  stats: MockExamStats
}

export interface StartExamResponse {
  participationId: string
  startedAt: string
  duration: number
  sections: Section[]
}

export interface SubQuestionResult {
  subQuestionId: string
  score: number
  maxScore: number
  isCorrect: boolean
  userAnswer: string
  correctAnswer: string
  feedback?: string
}

export interface SectionResult {
  sectionId: string
  sectionTitle: string
  type: string
  totalScore: number
  maxScore: number
  questionResults: SubQuestionResult[]
  feedback?: {
    overallComment?: string
    suggestions?: string[]
    message?: string
  }
}

export interface ExamResult {
  participationId: string
  totalScore: number
  maxScore: number
  sectionResults: SectionResult[]
  completedAt: string
  sections?: Section[]
  title?: string
  level?: string
}

export interface FullResult extends ExamResult {
  sections: Section[]
  title: string
  level: string
}

export const mockExamService = {
  async getList(params?: {
    level?: string
    category?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  }) {
    const response = await api.get('/mock-exam/list', { params })
    return response.data as MockExamListResponse
  },

  async getExam(id: string) {
    const response = await api.get(`/mock-exam/${id}`)
    return response.data as MockExam
  },

  async startExam(examId: string) {
    const response = await api.post('/mock-exam/start', { exam_id: examId })
    return response.data as StartExamResponse
  },

  async submitExam(participationId: string, answers: Record<string, string>) {
    const response = await api.post('/mock-exam/submit', { participation_id: participationId, answers })
    return response.data as ExamResult
  },

  async abandonExam(participationId: string) {
    const response = await api.post('/mock-exam/abandon', { participation_id: participationId })
    return response.data
  },

  async getResult(participationId: string) {
    const response = await api.get(`/mock-exam/result/${participationId}`)
    return response.data as FullResult
  },

  async adminList(params?: { search?: string; level?: string; category?: string; page?: number; pageSize?: number }) {
    const response = await api.get('/admin/mock-exam/list', { params })
    return response.data as { exams: MockExam[]; total: number }
  },

  async adminCreate(data: {
    title: string
    description: string
    level: ExamLevel
    category: ExamCategory
    duration: number
    enabled?: boolean
    sections: Section[]
  }) {
    const response = await api.post('/admin/mock-exam', data)
    return response.data as MockExam
  },

  async adminUpdate(id: string, data: {
    title: string
    description: string
    level: ExamLevel
    category: ExamCategory
    duration: number
    enabled?: boolean
    sections: Section[]
  }) {
    const response = await api.put(`/admin/mock-exam/${id}`, data)
    return response.data as MockExam
  },

  async adminDelete(id: string) {
    const response = await api.delete(`/admin/mock-exam/${id}`)
    return response.data
  },

  async adminBatchDelete(ids: string[]) {
    const response = await api.post('/admin/mock-exam/batch-delete', { ids })
    return response.data
  },

  async adminBatchToggle(ids: string[], enabled: boolean) {
    const response = await api.post('/admin/mock-exam/batch-toggle', { ids, enabled })
    return response.data
  },
}
