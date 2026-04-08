// ═══ src/features/More.tsx ═══════════════════════════════════════
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'

type Section = { heading: string; items: Item[] }
type Item = { icon: string; label: string; sub: string; bg: string; path: string }

const SECTIONS: Section[] = [
  {
    heading: 'OPERATIONS',
    items: [
      { icon: '📊', label: 'Stock Counts',      sub: 'Opening and closing stock counts',         bg: '#eff6ff', path: '/stock-counts' },
      { icon: '🔄', label: 'Stock Movements',   sub: 'SMV transfers between revenue points',     bg: '#f0fdf4', path: '/smv' },
      { icon: '📤', label: 'Transfer Outs',      sub: 'Compliments, breakages, debtors, ullages', bg: '#fff7ed', path: '/transfer-outs' },
      { icon: '💵', label: 'Cash-Up',            sub: 'Daily cash reconciliation per till',       bg: '#f0fdf4', path: '/cash-up' },
      { icon: '⚖️', label: 'Adjustments',        sub: 'Stock increase/decrease corrections',      bg: '#fef3c7', path: '/adjustments' },
    ],
  },
  {
    heading: 'FINANCE',
    items: [
      { icon: '📋', label: 'Expenses',           sub: 'Capture and manage expense vouchers',      bg: '#eff6ff', path: '/expenses' },
      { icon: '📦', label: 'GRV — Goods Received', sub: 'Receive and manage goods vouchers',     bg: '#f0fdf4', path: '/grv' },
      { icon: '💰', label: 'Income',             sub: 'Record and approve income entries',        bg: '#f0fdf4', path: '/income' },
      { icon: '🏪', label: 'Suppliers',          sub: 'Manage accounts, balances and flags',      bg: '#fef3c7', path: '/suppliers' },
    ],
  },
  {
    heading: 'HR',
    items: [
      { icon: '👥', label: 'Employees',          sub: 'Manage staff records and profiles',        bg: '#f5f3ff', path: '/hr/employees' },
      { icon: '🗓️', label: 'Attendance',         sub: 'Daily attendance and shift records',       bg: '#eff6ff', path: '/hr/attendance' },
      { icon: '💸', label: 'Payroll',            sub: 'Monthly payroll calculation',              bg: '#f0fdf4', path: '/hr/payroll' },
    ],
  },
  {
    heading: 'MANAGEMENT',
    items: [
      { icon: '📈', label: 'Stock Sheets',       sub: 'Daily stock position and variance',        bg: '#0a1628', path: '/stock-sheets' },
      { icon: '🧾', label: 'Debtors',            sub: 'Credit accounts and payment tracking',     bg: '#fef3c7', path: '/debtors' },
      { icon: '🏗️', label: 'Asset Register',     sub: 'Track equipment, furniture and assets',    bg: '#fff7ed', path: '/assets' },
      { icon: '✅', label: 'Approvals',          sub: 'Pending approvals across all modules',     bg: '#f0fdf4', path: '/approvals' },
      { icon: '📊', label: 'Reports',            sub: 'Expenses by branch, category, region',     bg: '#fdf4ff', path: '/reports' },
      { icon: '🔒', label: 'Close Day',          sub: 'Finalise and lock the business day',       bg: '#f3f4f6', path: '/close-day' },
    ],
  },
  {
    heading: 'SETTINGS',
    items: [
      { icon: '⚙️', label: 'Settings',          sub: 'Categories, users, payment methods',       bg: '#f3f4f6', path: '/settings' },
    ],
  },
]

export default function More() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
          {user?.initials ?? '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.role}</div>
        </div>
        <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
      </div>

      <div className="sb pb20" style={{ padding: '8px 12px 20px' }}>
        {SECTIONS.map(section => (
          <div key={section.heading} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', padding: '14px 4px 6px' }}>
              {section.heading}
            </div>
            {section.items.map(item => (
              <div key={item.path} onClick={() => navigate(item.path)}
                style={{ background: item.path === '/stock-sheets' ? '#0a1628' : '#fff', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', marginBottom: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: item.path === '/stock-sheets' ? '#1e3a5f' : item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: item.path === '/stock-sheets' ? '#f59e0b' : '#111827' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: item.path === '/stock-sheets' ? '#64748b' : '#6b7280', marginTop: 2 }}>{item.sub}</div>
                </div>
                <div style={{ color: item.path === '/stock-sheets' ? '#f59e0b' : '#9ca3af', fontSize: 18 }}>›</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
