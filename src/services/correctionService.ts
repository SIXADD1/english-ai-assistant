import api from './api'
import type { CorrectionResult } from '../types'

export const correctionService = {
  async getCorrectionResult(correctionId: string) {
    const response = await api.get(`/correction/${correctionId}`)
    return response.data as CorrectionResult
  },

  async getCorrectionHistory(params?: { page?: number; pageSize?: number }) {
    const response = await api.get('/correction/history', { params })
    return response.data as { corrections: CorrectionResult[]; total: number }
  },

  async getReviewReport(correctionId: string) {
    const response = await api.get(`/correction/report/${correctionId}`)
    return response.data
  },

  async getErrorLog() {
    const response = await api.get('/correction/error-log')
    return response.data
  },
}
