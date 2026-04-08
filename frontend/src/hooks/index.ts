import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  expenseApi, grvApi, supplierApi, incomeApi, approvalsApi, hrApi, reportsApi, referenceApi,
  revenuePointApi, stockCountApi, smvApi, transferOutApi, cashUpApi, stockSheetApi,
  adjustmentApi, debtorApi, closeDayApi, assetApi, usersApi,
} from '../api/client'
import { toast } from '../store'

// ── Reference ─────────────────────────────────────────────────────
export const useReferenceData = () =>
  useQuery({ queryKey: ['reference'], queryFn: referenceApi.getAll, staleTime: 5 * 60 * 1000 })

// ── Expenses ──────────────────────────────────────────────────────
export const useExpenses = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['expenses', params], queryFn: () => expenseApi.getAll(params) })

export const useExpense = (number: string) =>
  useQuery({ queryKey: ['expense', number], queryFn: () => expenseApi.getById(number), enabled: !!number })

export const useCreateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: expenseApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense created') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create expense'),
  })
}

export const useExpenseAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ number, action, notes }: { number: string; action: string; notes?: string }) =>
      expenseApi.action(number, action, notes),
    onSuccess: (_, { number }) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expense', number] })
      qc.invalidateQueries({ queryKey: ['approvals'] })
      toast.success('Action completed')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Action failed'),
  })
}

// ── GRV ───────────────────────────────────────────────────────────
export const useGrvs = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['grvs', params], queryFn: () => grvApi.getAll(params) })

export const useGrv = (number: string) =>
  useQuery({ queryKey: ['grv', number], queryFn: () => grvApi.getById(number), enabled: !!number })

export const useCreateGrv = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: grvApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grvs'] }); toast.success('GRV created') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create GRV'),
  })
}

// ── Suppliers ─────────────────────────────────────────────────────
export const useSuppliers = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['suppliers', params], queryFn: () => supplierApi.getAll(params) })

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => supplierApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier updated') },
  })
}

// ── Income ────────────────────────────────────────────────────────
export const useIncomes = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['incomes', params], queryFn: () => incomeApi.getAll(params) })

export const useCreateIncome = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: incomeApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); toast.success('Income recorded') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useApproveIncome = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ number, approve, reason }: { number: string; approve: boolean; reason?: string }) =>
      incomeApi.approve(number, approve, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); toast.success('Done') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Approvals ─────────────────────────────────────────────────────
export const usePendingApprovals = () =>
  useQuery({ queryKey: ['approvals'], queryFn: approvalsApi.getPending, refetchInterval: 30000 })

export const useExpressApproval = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => approvalsApi.express(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

// ── HR ────────────────────────────────────────────────────────────
export const useEmployees = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['employees', params], queryFn: () => hrApi.getEmployees(params) })

export const useEmployee = (id: string) =>
  useQuery({ queryKey: ['employee', id], queryFn: () => hrApi.getEmployee(id), enabled: !!id })

export const useCreateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee added') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useAttendance = (branchId: string, date: string) =>
  useQuery({
    queryKey: ['attendance', branchId, date],
    queryFn: () => hrApi.getAttendance(branchId, date),
    enabled: !!branchId && !!date,
  })

export const useSaveAttendance = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.saveAttendance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Attendance saved') },
  })
}

export const usePayroll = (branchId: string, month: number, year: number) =>
  useQuery({
    queryKey: ['payroll', branchId, month, year],
    queryFn: () => hrApi.getPayroll(branchId, month, year),
    enabled: !!branchId,
  })

export const useGeneratePayroll = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, month, year }: { branchId: string; month: number; year: number }) =>
      hrApi.generatePayroll(branchId, month, year),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success(`Generated ${data.generatedCount} entries`) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Reports ───────────────────────────────────────────────────────
export const useExpenseReport = (params: Record<string, unknown>, enabled: boolean) =>
  useQuery({ queryKey: ['report', params], queryFn: () => reportsApi.getExpenseReport(params), enabled })

export const useDashboardMetrics = () =>
  useQuery({ queryKey: ['dashboard-metrics'], queryFn: reportsApi.getDashboardMetrics, refetchInterval: 60000 })

// ── Revenue Points ────────────────────────────────────────────────
export const useRevenuePoints = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['revenue-points', params], queryFn: () => revenuePointApi.getAll(params) })

export const useCreateRevenuePoint = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: revenuePointApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenue-points'] }); toast.success('Revenue point created') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Stock Counts ──────────────────────────────────────────────────
export const useStockCounts = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['stock-counts', params], queryFn: () => stockCountApi.getAll(params) })

export const useStockCount = (id: string) =>
  useQuery({ queryKey: ['stock-count', id], queryFn: () => stockCountApi.getById(id), enabled: !!id })

export const useCreateStockCount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: stockCountApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-counts'] }); toast.success('Stock count saved') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useFinaliseStockCount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => stockCountApi.finalise(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-counts'] }); toast.success('Stock count finalised') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── SMV ───────────────────────────────────────────────────────────
export const useSmvs = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['smvs', params], queryFn: () => smvApi.getAll(params) })

export const useSmv = (id: string) =>
  useQuery({ queryKey: ['smv', id], queryFn: () => smvApi.getById(id), enabled: !!id })

export const useCreateSmv = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: smvApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['smvs'] }); toast.success('SMV created') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useSmvAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      action === 'approve' ? smvApi.approve(id) : smvApi.reject(id, reason!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['smvs'] }); qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Done') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Transfer Outs ─────────────────────────────────────────────────
export const useTransferOuts = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['transfer-outs', params], queryFn: () => transferOutApi.getAll(params) })

export const useTransferOut = (id: string) =>
  useQuery({ queryKey: ['transfer-out', id], queryFn: () => transferOutApi.getById(id), enabled: !!id })

export const useCreateTransferOut = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transferOutApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfer-outs'] }); toast.success('Transfer out recorded') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useTransferOutAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      action === 'approve' ? transferOutApi.approve(id) : transferOutApi.reject(id, reason!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfer-outs'] }); qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Done') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Cash-Up ───────────────────────────────────────────────────────
export const useCashUps = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['cash-ups', params], queryFn: () => cashUpApi.getAll(params) })

export const useCashUp = (id: string) =>
  useQuery({ queryKey: ['cash-up', id], queryFn: () => cashUpApi.getById(id), enabled: !!id })

export const useCreateCashUp = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cashUpApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-ups'] }); toast.success('Cash-up saved') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useCashUpAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      action === 'approve' ? cashUpApi.approve(id) : cashUpApi.reject(id, reason!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-ups'] }); qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Done') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Stock Sheet ───────────────────────────────────────────────────
export const useStockSheet = (branchId: string, rpId: string, date: string) =>
  useQuery({
    queryKey: ['stock-sheet', branchId, rpId, date],
    queryFn: () => stockSheetApi.get(branchId, rpId, date),
    enabled: !!branchId && !!rpId && !!date,
  })

// ── Adjustments ───────────────────────────────────────────────────
export const useAdjustments = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['adjustments', params], queryFn: () => adjustmentApi.getAll(params) })

export const useCreateAdjustment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adjustmentApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adjustments'] }); toast.success('Adjustment submitted') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useAdjustmentAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      action === 'approve' ? adjustmentApi.approve(id) : adjustmentApi.reject(id, reason!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adjustments'] }); qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Done') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Debtors ───────────────────────────────────────────────────────
export const useDebtors = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['debtors', params], queryFn: () => debtorApi.getAll(params) })

export const useDebtor = (id: string) =>
  useQuery({ queryKey: ['debtor', id], queryFn: () => debtorApi.getById(id), enabled: !!id })

export const useRecordDebtorPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => debtorApi.recordPayment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debtors'] }); toast.success('Payment recorded') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Close Day ─────────────────────────────────────────────────────
export const useCloseDayStatus = (branchId: string, date: string) =>
  useQuery({
    queryKey: ['close-day', branchId, date],
    queryFn: () => closeDayApi.getStatus(branchId, date),
    enabled: !!branchId && !!date,
  })

export const useCloseDay = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, date, notes }: { branchId: string; date: string; notes?: string }) =>
      closeDayApi.close(branchId, date, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['close-day'] }); toast.success('Day closed') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Cannot close day'),
  })
}

export const useReopenDay = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, date, reason }: { branchId: string; date: string; reason: string }) =>
      closeDayApi.reopen(branchId, date, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['close-day'] }); toast.success('Day reopened') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Assets ────────────────────────────────────────────────────────
export const useAssets = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['assets', params], queryFn: () => assetApi.getAll(params) })

export const useAsset = (id: string) =>
  useQuery({ queryKey: ['asset', id], queryFn: () => assetApi.getById(id), enabled: !!id })

export const useCreateAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset registered') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useAssetLocations = () =>
  useQuery({ queryKey: ['asset-locations'], queryFn: assetApi.getLocations })

export const useMoveAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.move,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Movement recorded') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useLendAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.lend,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset lent out') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

export const useReturnLending = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assetApi.return(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset returned') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}

// ── Users ─────────────────────────────────────────────────────────
export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: usersApi.getAll })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created') },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })
}
