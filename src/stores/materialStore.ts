import { create } from 'zustand'
import type { Material } from '../types'
import { materialService } from '../services/materialService'

interface MaterialFilters {
  category?: string
  type?: string
  level?: string
  keyword?: string
}

interface MaterialState {
  materials: Material[]
  favorites: Material[]
  currentMaterial: Material | null
  filters: MaterialFilters
  isLoading: boolean
  setMaterials: (materials: Material[]) => void
  setFavorites: (favorites: Material[]) => void
  setCurrentMaterial: (material: Material | null) => void
  setFilters: (filters: MaterialFilters) => void
  toggleFavorite: (materialId: string) => Promise<void>
  addToFavorites: (material: Material) => void
  removeFromFavorites: (materialId: string) => void
  setLoading: (loading: boolean) => void
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  favorites: [],
  currentMaterial: null,
  filters: {},
  isLoading: false,
  setMaterials: (materials) => set({ materials }),
  setFavorites: (favorites) => set({ favorites }),
  setCurrentMaterial: (material) => set({ currentMaterial: material }),
  setFilters: (filters) => set({ filters }),
  toggleFavorite: async (materialId) => {
    const { materials, favorites } = get()
    const material = materials.find((m) => m.id === materialId)
    if (!material) return

    const wasFavorite = material.isFavorite
    material.isFavorite = !wasFavorite
    set({ materials: [...materials] })

    try {
      if (wasFavorite) {
        await materialService.removeFromFavorites(materialId)
        set({ favorites: favorites.filter((m) => m.id !== materialId) })
      } else {
        await materialService.addToFavorites(materialId)
        set({ favorites: [...favorites, material] })
      }
    } catch (error) {
      material.isFavorite = wasFavorite
      set({ materials: [...materials] })
      console.error('收藏操作失败:', error)
    }
  },
  addToFavorites: (material) =>
    set((state) => ({
      favorites: [...state.favorites, material],
    })),
  removeFromFavorites: (materialId) =>
    set((state) => ({
      favorites: state.favorites.filter((m) => m.id !== materialId),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}))