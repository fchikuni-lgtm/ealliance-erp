// ═══ StockMovements.tsx ═══════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSmvs, useSmvAction } from '../../hooks'
import { StatusPill } from '../../components/ui'
import { fmt } from '../../components/ui'
import type { SmvListDto } from '../../types'
import { useAuthStore } from '../../store'

export default function StockMovements() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useSmvs({ page })
  const { mutateAsync: doAction, isPending } = useSmvAction()

  async function approve(id: string) { await doAction({ id, action: 'approve' }) }

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Stock Movements</div>
        <button onClick={() => navigate('/smv/new')} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>+ New</button>
      </div>

      <div className="sb pb20" style={{ padding: 12 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {data?.items?.map((smv: SmvListDto) => (
          <div key={smv.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{smv.smvNumber}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {smv.date} · {smv.branchName}
                  {smv.isCrossBranch && <span style={{ color: '#f59e0b', marginLeft: 6 }}>Cross-branch</span>}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                  {smv.fromRpName ?? smv.fromWarehouse} → {smv.toRpName ?? smv.toWarehouse}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusPill status={smv.status} />
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>${fmt(smv.totalSell)}</div>
              </div>
            </div>
            {smv.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'BranchManager') && (
              <button disabled={isPending} onClick={() => approve(smv.id)}
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
