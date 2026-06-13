import api from './api'
import type { Material } from '../types'

export const materialService = {
  async getMaterials(params?: {
    category?: string
    type?: string
    level?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) {
    const response = await api.get('/materials', { params })
    return response.data as { materials: Material[]; total: number }
  },

  async getMaterialById(id: string) {
    const response = await api.get(`/materials/${id}`)
    return response.data as Material
  },

  async searchMaterials(keyword: string) {
    const response = await api.get('/materials/search', { params: { keyword } })
    return response.data as Material[]
  },

  async addToFavorites(materialId: string) {
    const response = await api.post('/materials/favorite', { materialId })
    return response.data
  },

  async removeFromFavorites(materialId: string) {
    const response = await api.delete(`/materials/favorite/${materialId}`)
    return response.data
  },

  async getFavorites() {
    const response = await api.get('/materials/favorites')
    return response.data as Material[]
  },
}
