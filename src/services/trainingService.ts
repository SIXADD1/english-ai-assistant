import api from './api'

export interface TrainingExercise {
  id: string
  type: string
  title: string
  content: string
  requirements: string
  level: string
  answer: any
  sortOrder: number
  createdAt: string
}

export interface TrainingSubmitResult {
  id: string
  score: number | null
  feedback: string | null
  referenceAnswer: any
}

export interface TrainingHistoryRecord {
  id: string
  userId: string
  exerciseId: string
  type: string
  answer: string
  score: number
  feedback: string
  aiFeedback: string
  exerciseTitle: string
  exerciseType: string
  createdAt: string
}

export interface TrainingStats {
  totalExercises: number
  averageScore: string
  typeStats: Array<{ type: string; count: number; avgScore: string }>
}

export const trainingService = {
  async getExercises(params?: { type?: string; level?: string; page?: number; pageSize?: number }) {
    const response = await api.get('/training/exercises', { params })
    return response.data as { exercises: TrainingExercise[]; total: number }
  },

  async getExerciseById(id: string) {
    const response = await api.get(`/training/exercises/${id}`)
    return response.data as TrainingExercise
  },

  async submitAnswer(data: {
    exerciseId?: string
    type: string
    userAnswer: string
    answer?: string
  }) {
    const response = await api.post('/training/submit', {
      exerciseId: data.exerciseId,
      type: data.type,
      userAnswer: data.userAnswer,
      answer: data.answer || data.userAnswer,
    })
    return response.data as TrainingSubmitResult
  },

  async getHistory(params?: { page?: number; pageSize?: number; type?: string }) {
    const response = await api.get('/training/history', { params })
    return response.data as { records: TrainingHistoryRecord[]; total: number }
  },

  async getStats() {
    const response = await api.get('/training/stats')
    return response.data as TrainingStats
  },

  async getCompleted(type?: string) {
    const response = await api.get('/training/completed', { params: { type } })
    return response.data as { completedIds: string[] }
  },

  async resetTraining(type: string) {
    const response = await api.delete('/training/reset', { params: { type } })
    return response.data
  },

  async saveTrainingRecord(data: {
    questionId?: string
    type: string
    answer: string
    score?: number
    feedback?: string
  }) {
    const response = await api.post('/training/save', data)
    return response.data
  },
}
