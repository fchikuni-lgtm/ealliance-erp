// api/client.ts — Axios API client with JWT auth and auto-refresh
import axios from 'axios'
import { useAuthStore } from '../store/index'

// In production (Railway): VITE_API_URL = https://ealliance-api.railway.app
// In development: proxy via vite.config.ts → http://localhost:5000
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request: attach JWT ───────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: auto-refresh on 401 ────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { refreshToken, setTokens, signOut } = useAuthStore.getState()
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        setTokens(res.data.accessToken, res.data.refreshToken)
        original.headers.Authorization = `Bearer ${res.data.accessToken}`
        return api(original)
      } catch { useAuthStore.getState().signOut() }
    }
    return Promise.reject(error)
  }
)

// ── Typed API calls ───────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then(r => r.data),
}

export const referenceApi = {
  getAll: () => api.get('/reference').then(r => r.data),
  addCategory: (name: string) => api.post('/reference/categories', { name }),
  addBranch: (name: string, regionId: string) => api.post('/reference/branches', { name, regionId }),
  addPaymentMethod: (name: string, currency: string) => api.post('/reference/payment-methods', { name, currency }),
  addRegion: (name: string) => api.post('/reference/regions', { name }),
  addProduct: (data: unknown) => api.post('/reference/products', data),
  updateProduct: (id: string, data: unknown) => api.put(`/reference/products/${id}`, data),
  addWorkman: (name: string) => api.post('/reference/workmen', { name }),
}

export const expenseApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/expenses', { params }).then(r => r.data),
  getById: (number: string) => api.get(`/expenses/${number}`).then(r => r.data),
  create: (data: unknown) => api.post('/expenses', data).then(r => r.data),
  action: (number: string, action: string, notes?: string) =>
    api.post(`/expenses/${number}/action`, { action, notes }),
}

export const grvApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/grv', { params }).then(r => r.data),
  getById: (number: string) => api.get(`/grv/${number}`).then(r => r.data),
  create: (data: unknown) => api.post('/grv', data).then(r => r.data),
}

export const supplierApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/suppliers', { params }).then(r => r.data),
  update: (id: string, data: unknown) => api.put(`/suppliers/${id}`, data),
  setFlag: (id: string, flag: string) => api.post(`/suppliers/${id}/flag`, { flag }),
}

export const incomeApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/income', { params }).then(r => r.data),
  create: (data: unknown) => api.post('/income', data).then(r => r.data),
  approve: (number: string, approve: boolean, reason?: string) =>
    api.post(`/income/${number}/approve`, { approve, reason }),
}

export const approvalsApi = {
  getPending: () => api.get('/approvals/pending').then(r => r.data),
  express: (ids: string[]) => api.post('/approvals/express', { ids }).then(r => r.data),
}

export const hrApi = {
  getEmployees: (params?: Record<string, unknown>) =>
    api.get('/hr/employees', { params }).then(r => r.data),
  getEmployee: (id: string) => api.get(`/hr/employees/${id}`).then(r => r.data),
  createEmployee: (data: unknown) => api.post('/hr/employees', data).then(r => r.data),
  getAttendance: (branchId: string, date: string) =>
    api.get('/hr/attendance', { params: { branchId, date } }).then(r => r.data),
  saveAttendance: (data: unknown) => api.post('/hr/attendance', data),
  getPayroll: (branchId: string, month: number, year: number) =>
    api.get('/hr/payroll', { params: { branchId, month, year } }).then(r => r.data),
  generatePayroll: (branchId: string, month: number, year: number) =>
    api.post('/hr/payroll/generate', { branchId, month, year }).then(r => r.data),
  approvePayroll: (id: string) => api.post(`/hr/payroll/${id}/approve`),
}

export const reportsApi = {
  getExpenseReport: (params: Record<string, unknown>) =>
    api.get('/reports/expenses', { params }).then(r => r.data),
  getIncomeVsExpense: (params: Record<string, unknown>) =>
    api.get('/reports/income-vs-expense', { params }).then(r => r.data),
  getPayrollReport: (params: Record<string, unknown>) =>
    api.get('/reports/payroll', { params }).then(r => r.data),
  getGrvReport: (params: Record<string, unknown>) =>
    api.get('/reports/grv', { params }).then(r => r.data),
  getDashboardMetrics: () =>
    api.get('/reports/dashboard-metrics').then(r => r.data),
}

export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  create: (data: unknown) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
}

// ── eAlliance StockMaster API calls ───────────────────────────────

export const revenuePointApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/revenue-points', { params }).then(r => r.data),
  create: (data: unknown) => api.post('/revenue-points', data).then(r => r.data),
  update: (id: string, data: unknown) => api.put(`/revenue-points/${id}`, data),
  toggle: (id: string) => api.post(`/revenue-points/${id}/toggle`),
}

export const stockCountApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/stock-counts', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/stock-counts/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/stock-counts', data).then(r => r.data),
  finalise: (id: string) => api.post(`/stock-counts/${id}/finalise`),
  getPrevClosing: (branchId: string, rpId: string, date: string) =>
    api.get('/stock-counts/prev-closing', { params: { branchId, rpId, date } }).then(r => r.data),
}

export const smvApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/smv', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/smv/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/smv', data).then(r => r.data),
  approve: (id: string) => api.post(`/smv/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/smv/${id}/reject`, { reason }),
}

export const transferOutApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/transfer-outs', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/transfer-outs/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/transfer-outs', data).then(r => r.data),
  approve: (id: string) => api.post(`/transfer-outs/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/transfer-outs/${id}/reject`, { reason }),
}

export const cashUpApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/cash-ups', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/cash-ups/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/cash-ups', data).then(r => r.data),
  approve: (id: string) => api.post(`/cash-ups/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/cash-ups/${id}/reject`, { reason }),
}

export const stockSheetApi = {
  get: (branchId: string, revenuePointId: string, date: string) =>
    api.get('/stock-sheets', { params: { branchId, revenuePointId, date } }).then(r => r.data),
}

export const adjustmentApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/adjustments', { params }).then(r => r.data),
  create: (data: unknown) => api.post('/adjustments', data).then(r => r.data),
  approve: (id: string) => api.post(`/adjustments/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/adjustments/${id}/reject`, { reason }),
}

export const debtorApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/debtors', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/debtors/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/debtors', data).then(r => r.data),
  recordPayment: (id: string, data: unknown) => api.post(`/debtors/${id}/payment`, data),
}

export const closeDayApi = {
  getStatus: (branchId: string, date: string) =>
    api.get('/close-day/status', { params: { branchId, date } }).then(r => r.data),
  close: (branchId: string, date: string, notes?: string) =>
    api.post('/close-day', { branchId, date, notes }),
  reopen: (branchId: string, date: string, reason: string) =>
    api.post('/close-day/reopen', { branchId, date, reason }),
}

export const assetApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/assets', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/assets/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/assets', data).then(r => r.data),
  move: (data: unknown) => api.post('/assets/move', data).then(r => r.data),
  lend: (data: unknown) => api.post('/assets/lend', data).then(r => r.data),
  return: (id: string) => api.post(`/assets/lendings/${id}/return`),
  reportDamage: (data: unknown) => api.post('/assets/damage', data),
  getLocations: () => api.get('/assets/locations').then(r => r.data),
  createLocation: (data: unknown) => api.post('/assets/locations', data).then(r => r.data),
}
