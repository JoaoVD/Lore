import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setLoading: (isLoading) => set({ isLoading }),
}))
