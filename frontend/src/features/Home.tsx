// ═══ src/features/Home.tsx ════════════════════════════════════════
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { useExpenses, usePendingApprovals, useDashboardMetrics } from '../hooks'
import { useRefStore } from '../store'
import { fmt, StatusPill } from '../components/ui'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const { data: expenses, isLoading } = useExpenses({ pageSize: 8 })
  const { data: approvals } = usePendingApprovals()
  const { data: metrics } = useDashboardMetrics()

  const pendingCount = approvals?.length ?? 0

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', padding: '12px 16px 0', flexShrink: 0 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16 }}>
          <div onClick={() => navigate('/more')} style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' }}>
            {user?.initials ?? '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Good day 👋</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.name}</div>
          </div>
        </div>

        {/* Payment method balances */}
        <div style={{ paddingBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8, fontWeight: 600 }}>Currency Balances</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {ref?.paymentMethods.map(pm => (
              <div key={pm.id} style={{ background: '#1e3a5f', borderRadius: 12, padding: '12px 16px', minWidth: 150, flexShrink: 0, border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{pm.name}</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: '-.5px' }}>{pm.currency} {fmt(pm.balance)}</div>
                <div style={{ color: '#64748b', fontSize: 10, marginTop: 3 }}>In: {fmt(pm.incomeTotal)} · Out: {fmt(pm.expenseTotal)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingBottom: 16 }}>
          <MetricCard
            label="Pending Approvals"
            value={pendingCount}
            accent={pendingCount > 0 ? '#f59e0b' : '#10b981'}
            onClick={() => navigate('/approvals')}
          />
          <MetricCard
            label="Today Expenses"
            value={metrics?.todayExpenses != null ? `$${fmt(metrics.todayExpenses)}` : '—'}
            accent="#60a5fa"
            onClick={() => navigate('/expenses')}
          />
          <MetricCard
            label="Flagged Items"
            value={metrics?.flaggedCount ?? 0}
            accent={metrics?.flaggedCount > 0 ? '#ef4444' : '#10b981'}
            onClick={() => navigate('/expenses')}
          />
          <MetricCard
            label="Month Payroll"
            value={metrics?.monthPayroll != null ? `$${fmt(metrics.monthPayroll)}` : '—'}
            accent="#a78bfa"
            onClick={() => navigate('/hr/payroll')}
          />
          <MetricCard
            label="Pending Stock"
            value={metrics?.pendingStockApprovals ?? 0}
            accent={metrics?.pendingStockApprovals > 0 ? '#f97316' : '#10b981'}
            onClick={() => navigate('/approvals')}
          />
          <MetricCard
            label="Stock Sheets"
            value="View →"
            accent="#f59e0b"
            onClick={() => navigate('/stock-sheets')}
          />
        </div>
      </div>

      {/* Recent expenses */}
      <div className="sb pb20" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>Recent Expenses</div>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {expenses?.items?.map((e: any) => (
          <div key={e.id} onClick={() => navigate(`/expenses/${e.expenseNumber}`)}
            style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.categoryName} — {e.branchName}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{e.expenseNumber} · {e.date}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.currency} {fmt(e.amount)}</div>
              <StatusPill status={e.status} />
            </div>
          </div>
        ))}
      </div>
      <button className="fab" onClick={() => navigate('/expenses/new')}>＋</button>
    </div>
  )
}

function MetricCard({ label, value, accent, onClick }: { label: string; value: string | number; accent: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: '#1e3a5f', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', border: `1px solid ${accent}22` }}>
      <div style={{ color: accent, fontSize: 17, fontWeight: 700, letterSpacing: '-.3px' }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  )
}
