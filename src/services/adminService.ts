import api from './api'
import type { User, Material, Question } from '../types'

export interface AdminStats {
  totalUsers: number
  totalMaterials: number
  totalQuestions: number
  totalCorrections: number
  todayNewUsers: number
  todayCorrections: number
}

export interface PagedResponse<T> {
  items: T[]
  total: number
}

export interface SystemConfig {
  id: string
  configKey: string
  configValue: string
  configType: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface CorrectionStatsItem {
  period: string
  count: number
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats')
    return response.data
  },

  async getUsers(params: {
    page?: number
    pageSize?: number
    keyword?: string
    status?: string
    role?: string
  }): Promise<PagedResponse<User>> {
    const response = await api.get('/admin/users', { params })
    return { items: response.data.users, total: response.data.total }
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await api.put(`/admin/users/${id}`, data)
    return response.data
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`)
  },

  async getMaterials(params: {
    page?: number
    pageSize?: number
    keyword?: string
    category?: string
    level?: string
  }): Promise<PagedResponse<Material>> {
    const response = await api.get('/admin/materials', { params })
    return { items: response.data.materials, total: response.data.total }
  },

  async createMaterial(data: Omit<Material, 'id' | 'createdAt' | 'favoritesCount'>): Promise<{ id: string }> {
    const response = await api.post('/admin/materials', data)
    return response.data
  },

  async updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
    const response = await api.put(`/admin/materials/${id}`, data)
    return response.data
  },

  async deleteMaterial(id: string): Promise<void> {
    await api.delete(`/admin/materials/${id}`)
  },

  async toggleMaterialActive(id: string, isActive: boolean): Promise<void> {
    await api.put(`/admin/materials/${id}/toggle-active`, { isActive })
  },

  async batchToggleMaterials(isActive: boolean, category?: string): Promise<void> {
    await api.put('/admin/materials/batch-toggle', { isActive, category })
  },

  async getQuestions(params: {
    page?: number
    pageSize?: number
    keyword?: string
    type?: string
    level?: string
    topic?: string
    difficulty?: string
    year?: string
  }): Promise<PagedResponse<Question>> {
    const response = await api.get('/admin/questions', { params })
    return { items: response.data.questions, total: response.data.total }
  },

  async createQuestion(data: Omit<Question, 'id' | 'createdAt'>): Promise<{ id: string }> {
    const response = await api.post('/admin/questions', data)
    return response.data
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const response = await api.put(`/admin/questions/${id}`, data)
    return response.data
  },

  async deleteQuestion(id: string): Promise<void> {
    await api.delete(`/admin/questions/${id}`)
  },

  async toggleQuestionActive(id: string, isActive: boolean): Promise<void> {
    await api.put(`/admin/questions/${id}/toggle-active`, { isActive })
  },

  async batchToggleQuestions(isActive: boolean, type?: string, level?: string): Promise<void> {
    await api.put('/admin/questions/batch-toggle', { isActive, type, level })
  },

  async getQuestionYears(): Promise<number[]> {
    const response = await api.get('/admin/questions/years')
    return response.data.years
  },

  async getConfigs(): Promise<SystemConfig[]> {
    const response = await api.get('/admin/configs')
    return response.data
  },

  async updateConfigs(configs: Array<{ configKey: string; configValue: string }>): Promise<{ success: boolean }> {
    const response = await api.put('/admin/configs', {
      configs: configs.map(c => ({ config_key: c.configKey, config_value: c.configValue }))
    })
    return response.data
  },

  async getTrainingExercises(params: {
    page?: number
    pageSize?: number
    type?: string
    level?: string
  }): Promise<PagedResponse<any>> {
    const response = await api.get('/admin/training/exercises', { params })
    return { items: response.data.exercises, total: response.data.total }
  },

  async createTrainingExercise(data: {
    type: string
    title: string
    content: string
    requirements?: string
    level: string
    answer: any
    sortOrder?: number
    isActive?: boolean
  }): Promise<{ id: string }> {
    const response = await api.post('/admin/training/exercises', data)
    return response.data
  },

  async updateTrainingExercise(id: string, data: {
    type: string
    title: string
    content: string
    requirements?: string
    level: string
    answer: any
    sortOrder?: number
    isActive?: boolean
  }): Promise<{ success: boolean }> {
    const response = await api.put(`/admin/training/exercises/${id}`, data)
    return response.data
  },

  async deleteTrainingExercise(id: string): Promise<void> {
    await api.delete(`/admin/training/exercises/${id}`)
  },

  async batchToggleTrainingExercises(isActive: boolean, type?: string): Promise<void> {
    await api.put('/admin/training/exercises/batch-toggle', { isActive, type })
  },

  async getCorrectionStats(granularity: string = 'day'): Promise<CorrectionStatsItem[]> {
    const response = await api.get('/admin/correction-stats', { params: { granularity } })
    return response.data
  },

  async getTrainingStats(granularity: string = 'day'): Promise<CorrectionStatsItem[]> {
    const response = await api.get('/admin/training-stats', { params: { granularity } })
    return response.data
  },

  async getUserStats(granularity: string = 'day'): Promise<CorrectionStatsItem[]> {
    const response = await api.get('/admin/user-stats', { params: { granularity } })
    return response.data
  },
}