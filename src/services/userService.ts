import api from './api'
import type { User } from '../types'

export const userService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  async checkUsername(username: string): Promise<boolean> {
    const response = await api.get('/auth/check-username', { params: { username } })
    return response.data.available
  },

  async register(username: string, email: string, password: string, level: string) {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      level,
    })
    return response.data
  },

  async getProfile() {
    const response = await api.get('/user/profile')
    return response.data as User
  },

  async updateProfile(data: Partial<User>) {
    const response = await api.put('/user/profile', data)
    return response.data as User
  },

  async uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const response = await api.put('/user/password', { oldPassword, newPassword })
    return response.data
  },

  async getStats() {
    const response = await api.get('/user/stats')
    return response.data
  },

  async getRecords(page = 1, pageSize = 10) {
    const response = await api.get('/user/records', { params: { page, pageSize } })
    return response.data
  },

  async deleteRecord(id: string) {
    const response = await api.delete(`/user/records/${id}`)
    return response.data
  },

  async batchDeleteRecords(ids: string[]) {
    const response = await api.post('/user/records/batch-delete', { ids })
    return response.data
  },

  async getMockExamRecords(page = 1, pageSize = 10) {
    const response = await api.get('/user/mock-exam-records', { params: { page, pageSize } })
    return response.data
  },

  async deleteMockExamRecord(id: string) {
    const response = await api.delete(`/user/mock-exam-records/${id}`)
    return response.data
  },

  async batchDeleteMockExamRecords(ids: string[]) {
    const response = await api.post('/user/mock-exam-records/batch-delete', { ids })
    return response.data
  },

  async getCorrections(page = 1, pageSize = 10) {
    const response = await api.get('/user/corrections', { params: { page, pageSize } })
    return response.data
  },

  async getFavorites(page = 1, pageSize = 10) {
    const response = await api.get('/user/favorites', { params: { page, pageSize } })
    return response.data
  },

  async addFavorite(materialId: string) {
    const response = await api.post(`/user/favorites/${materialId}`)
    return response.data
  },

  async removeFavorite(materialId: string) {
    const response = await api.delete(`/user/favorites/${materialId}`)
    return response.data
  },

  async checkin(type = 'daily') {
    const response = await api.post('/user/checkin', { type })
    return response.data
  },

  async logout() {
    const response = await api.post('/auth/logout')
    return response.data
  },
}
