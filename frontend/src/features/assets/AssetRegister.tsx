// ═══ AssetRegister.tsx ════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssets } from '../../hooks'
import { fmt } from '../../components/ui'
import type { AssetListDto } from '../../types'
import { useRefStore } from '../../store'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#d1fae5', color: '#065f46' },
  OnLoan: { bg: '#dbeafe', color: '#1e40af' },
  Damaged: { bg: '#fee2e2', color: '#991b1b' },
  Sold: { bg: '#f3f4f6', color: '#374151' },
  WrittenOff: { bg: '#fef3c7', color: '#92400e' },
}

export default function AssetRegister() {
  const navigate = useNavigate()
  const { data: ref } = useRefStore()
  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAssets(Object.fromEntries(
    Object.entries({ search, branchId, status, page }).filter(([, v]) => v !== '' && v !== 1)
  ))

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Asset Register</div>
        <button onClick={() => navigate('/assets/new')} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>+ New</button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit' }} />
        <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1) }}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All branches</option>
          {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All status</option>
          {['Active', 'OnLoan', 'Damaged', 'Sold', 'WrittenOff'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="sb pb20" style={{ padding: 12 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {data?.items?.map((a: AssetListDto) => (
          <div key={a.id} onClick={() => navigate(`/assets/${a.id}`)}
            style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏗️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name}{a.subName ? ` — ${a.subName}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{a.assetNumber} · {a.branchName}</div>
              {a.locationName && <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.locationName}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ ...STATUS_COLORS[a.status], padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-block' }}>{a.status}</span>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>${fmt(a.value)}</div>
            </div>
          </div>
        ))}
        {!isLoading && !data?.items?.length && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>No assets found</div>
        )}
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
