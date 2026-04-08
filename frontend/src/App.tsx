import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useToastStore } from './store'
import { useReferenceData } from './hooks'

// Pages (all lazy-loaded for performance)
import { lazy, Suspense, useEffect } from 'react'
import { useRefStore } from './store'

const Login           = lazy(() => import('./features/auth/Login'))
const Home            = lazy(() => import('./features/Home'))
const ExpenseList     = lazy(() => import('./features/expenses/ExpenseList'))
const ExpenseWizard   = lazy(() => import('./features/expenses/ExpenseWizard'))
const ExpenseDetail   = lazy(() => import('./features/expenses/ExpenseDetail'))
const Approvals       = lazy(() => import('./features/approvals/Approvals'))
const Express         = lazy(() => import('./features/approvals/Express'))
const GrvList         = lazy(() => import('./features/grv/GrvList'))
const GrvWizard       = lazy(() => import('./features/grv/GrvWizard'))
const Suppliers       = lazy(() => import('./features/suppliers/Suppliers'))
const Income          = lazy(() => import('./features/income/Income'))
const Reports         = lazy(() => import('./features/reports/Reports'))
const HRHome          = lazy(() => import('./features/hr/HRHome'))
const Employees       = lazy(() => import('./features/hr/Employees'))
const EmployeeWizard  = lazy(() => import('./features/hr/EmployeeWizard'))
const Attendance      = lazy(() => import('./features/hr/Attendance'))
const Payroll         = lazy(() => import('./features/hr/Payroll'))
const Settings        = lazy(() => import('./features/settings/Settings'))
const More            = lazy(() => import('./features/More'))

// eAlliance StockMaster modules
const StockCounts     = lazy(() => import('./features/stock/StockCounts'))
const StockCountWizard = lazy(() => import('./features/stock/StockCountWizard'))
const StockMovements  = lazy(() => import('./features/stock/StockMovements'))
const SmvWizard       = lazy(() => import('./features/stock/SmvWizard'))
const TransferOuts    = lazy(() => import('./features/stock/TransferOuts'))
const TransferOutWizard = lazy(() => import('./features/stock/TransferOutWizard'))
const CashUp          = lazy(() => import('./features/stock/CashUp'))
const CashUpWizard    = lazy(() => import('./features/stock/CashUpWizard'))
const StockSheets     = lazy(() => import('./features/stock/StockSheets'))
const Adjustments     = lazy(() => import('./features/stock/Adjustments'))
const Debtors         = lazy(() => import('./features/stock/Debtors'))
const DebtorDetail    = lazy(() => import('./features/stock/DebtorDetail'))
const CloseDay        = lazy(() => import('./features/stock/CloseDay'))
const AssetRegister   = lazy(() => import('./features/assets/AssetRegister'))
const AssetDetail     = lazy(() => import('./features/assets/AssetDetail'))
const AssetWizard     = lazy(() => import('./features/assets/AssetWizard'))

const TAB_PATHS = ['/', '/expenses', '/approvals', '/more']
const ICONS: Record<string, string> = { '/': '🏠', '/expenses': '📋', '/approvals': '✅', '/more': '☰' }
const LABELS: Record<string, string> = { '/': 'Home', '/expenses': 'Expenses', '/approvals': 'Approvals', '/more': 'More' }

function Spinner() {
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
      <div className="text-center">
        <div style={{ color: '#f59e0b', fontSize: 36, fontWeight: 800 }}>eAlliance</div>
        <div className="spinner" style={{ margin: '24px auto 0' }} />
      </div>
    </div>
  )
}

export default function App() {
  const { user } = useAuthStore()
  const toast = useToastStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: refData } = useReferenceData()
  const { setData } = useRefStore()

  useEffect(() => { if (refData) setData(refData) }, [refData])

  if (!user) return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    </Suspense>
  )

  const isTabPath = TAB_PATHS.some(p => location.pathname === p)
  const activeTab = TAB_PATHS.find(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p))) ?? '/'

  return (
    <div className="screen">
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            {/* Core */}
            <Route path="/" element={<Home />} />
            <Route path="/more" element={<More />} />

            {/* Expenses */}
            <Route path="/expenses" element={<ExpenseList />} />
            <Route path="/expenses/new" element={<ExpenseWizard />} />
            <Route path="/expenses/:number" element={<ExpenseDetail />} />

            {/* Approvals */}
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/approvals/express" element={<Express />} />

            {/* Finance */}
            <Route path="/grv" element={<GrvList />} />
            <Route path="/grv/new" element={<GrvWizard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/income" element={<Income />} />
            <Route path="/reports" element={<Reports />} />

            {/* HR */}
            <Route path="/hr" element={<HRHome />} />
            <Route path="/hr/employees" element={<Employees />} />
            <Route path="/hr/employees/new" element={<EmployeeWizard />} />
            <Route path="/hr/attendance" element={<Attendance />} />
            <Route path="/hr/payroll" element={<Payroll />} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />

            {/* Operations — Stock */}
            <Route path="/stock-counts" element={<StockCounts />} />
            <Route path="/stock-counts/new" element={<StockCountWizard />} />
            <Route path="/smv" element={<StockMovements />} />
            <Route path="/smv/new" element={<SmvWizard />} />
            <Route path="/transfer-outs" element={<TransferOuts />} />
            <Route path="/transfer-outs/new" element={<TransferOutWizard />} />
            <Route path="/cash-up" element={<CashUp />} />
            <Route path="/cash-up/new" element={<CashUpWizard />} />
            <Route path="/adjustments" element={<Adjustments />} />

            {/* Management */}
            <Route path="/stock-sheets" element={<StockSheets />} />
            <Route path="/debtors" element={<Debtors />} />
            <Route path="/debtors/:id" element={<DebtorDetail />} />
            <Route path="/close-day" element={<CloseDay />} />

            {/* Assets */}
            <Route path="/assets" element={<AssetRegister />} />
            <Route path="/assets/new" element={<AssetWizard />} />
            <Route path="/assets/:id" element={<AssetDetail />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {/* Bottom navigation */}
      {isTabPath && (
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#0a1628', display: 'flex', zIndex: 900, borderTop: '1px solid #1e3a5f', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {TAB_PATHS.map(path => (
            <button key={path} onClick={() => navigate(path)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px 10px', border: 'none', background: 'none', color: activeTab === path ? '#f59e0b' : '#64748b', fontSize: 10, gap: 3, cursor: 'pointer', fontFamily: 'inherit', transition: 'color .2s' }}>
              <span style={{ fontSize: 20 }}>{ICONS[path]}</span>
              {LABELS[path]}
            </button>
          ))}
        </nav>
      )}

      {/* Toast */}
      {toast.message && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#0a1628', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 14, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.3)', animation: 'fadeIn .3s' }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
