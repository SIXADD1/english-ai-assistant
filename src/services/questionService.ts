import api from './api'
import type { Question, Draft } from '../types'

export const questionService = {
  async getQuestions(params?: {
    level?: string
    type?: string
    topic?: string
    difficulty?: string
    year?: string
    page?: number
    pageSize?: number
  }) {
    const response = await api.get('/questions', { params })
    return response.data as { questions: Question[]; total: number }
  },

  async getQuestionById(id: string) {
    const response = await api.get(`/questions/${id}`)
    return response.data as Question
  },

  async saveDraft(questionId: string, content: string, timeSpent: number) {
    const response = await api.post('/draft/save', {
      questionId,
      content,
      timeSpent,
    })
    return response.data as Draft
  },

  async getDraft(questionId: string) {
    const response = await api.get(`/draft/${questionId}`)
    return response.data as Draft | null
  },

  async submitWriting(questionId: string, content: string, timeSpent: number) {
    const response = await api.post('/writing/submit', {
      questionId,
      content,
      timeSpent,
    })
    return response.data as Draft
  },
}
