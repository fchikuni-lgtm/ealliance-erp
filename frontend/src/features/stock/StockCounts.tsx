// ═══ StockCounts.tsx ══════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStockCounts } from '../../hooks'
import type { StockCountListDto } from '../../types'

export default function StockCounts() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useStockCounts({ page })

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Stock Counts</div>
        <button onClick={() => navigate('/stock-counts/new')} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>+ New</button>
      </div>

      <div className="sb pb20" style={{ padding: 12 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {data?.items?.map((sc: StockCountListDto) => (
          <div key={sc.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{sc.countNumber}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sc.date} · {sc.branchName} · {sc.rpName}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{sc.type} · {sc.method}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: sc.isFinalised ? '#d1fae5' : '#fef3c7', color: sc.isFinalised ? '#065f46' : '#92400e', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  {sc.isFinalised ? 'Finalised' : 'Draft'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>By {sc.createdBy}</div>
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
