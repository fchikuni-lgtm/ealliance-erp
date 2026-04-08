// ═══ CashUp.tsx ═══════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCashUps, useCashUpAction } from '../../hooks'
import { StatusPill, fmt } from '../../components/ui'
import type { CashUpListDto } from '../../types'
import { useAuthStore } from '../../store'

export default function CashUp() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useCashUps({ page })
  const { mutateAsync: doAction, isPending } = useCashUpAction()

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Cash-Up</div>
        <button onClick={() => navigate('/cash-up/new')} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>+ New</button>
      </div>

      <div className="sb pb20" style={{ padding: 12 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {data?.items?.map((ca: CashUpListDto) => (
          <div key={ca.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{ca.caNumber}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{ca.date} · {ca.branchName}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{ca.pmName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusPill status={ca.status} />
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#059669' }}>${fmt(ca.totalUsd)}</div>
              </div>
            </div>
            {ca.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'BranchManager') && (
              <button disabled={isPending} onClick={() => doAction({ id: ca.id, action: 'approve' })}
                style={{ marginTop: 8, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                Approve
              </button>
            )}
          </div>
        ))}
        {data && data.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontFamily: 'inherit' }}>Prev</button>
            <span style={{ padding: '6px 10px', fontSize: 13, color: '#6b7280' }}>{page} / {data.totalPages}</span>
            <button disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontFamily: 'inherit' }}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
