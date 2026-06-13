import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface UserState {
  userInfo: User | null
  isLoggedIn: boolean
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userInfo: null,
      isLoggedIn: false,
      token: null,
      login: (user, token) => set({ userInfo: user, isLoggedIn: true, token }),
      logout: () => set({ userInfo: null, isLoggedIn: false, token: null }),
      updateUser: (user) =>
        set((state) => ({
          userInfo: state.userInfo ? { ...state.userInfo, ...user } : null,
        })),
    }),
    {
      name: 'user-storage',
    }
  )
)
