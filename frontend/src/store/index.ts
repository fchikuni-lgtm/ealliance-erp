import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserDto, ReferenceData } from '../types'

// ── Auth store ────────────────────────────────────────────────────
interface AuthState {
  user: UserDto | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: UserDto, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  signOut: () => void
  hasPerm: (perm: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      signOut: () => set({ user: null, accessToken: null, refreshToken: null }),
      hasPerm: (perm: string) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'Admin') return true
        return user.permissions.includes(perm)
      },
    }),
    { name: 'hollies-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
)

// ── Reference data store ──────────────────────────────────────────
interface RefState {
  data: ReferenceData | null
  loading: boolean
  setData: (d: ReferenceData) => void
  setLoading: (v: boolean) => void
  clear: () => void
}

export const useRefStore = create<RefState>()((set) => ({
  data: null,
  loading: false,
  setData: (data) => set({ data, loading: false }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ data: null }),
}))

// ── Toast store ───────────────────────────────────────────────────
interface ToastState {
  message: string | null
  type: 'success' | 'error' | 'info'
  show: (message: string, type?: 'success' | 'error' | 'info') => void
  hide: () => void
}

export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  type: 'success',
  show: (message, type = 'success') => {
    set({ message, type })
    setTimeout(() => set({ message: null }), 2500)
  },
  hide: () => set({ message: null }),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().show(msg, 'success'),
  error: (msg: string) => useToastStore.getState().show(msg, 'error'),
  info: (msg: string) => useToastStore.getState().show(msg, 'info'),
}
