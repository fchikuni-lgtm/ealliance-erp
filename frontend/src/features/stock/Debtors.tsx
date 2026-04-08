// ═══ Debtors.tsx ══════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtors } from '../../hooks'
import { fmt } from '../../components/ui'
import type { DebtorDto } from '../../types'

export default function Debtors() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useDebtors(search ? { search } : undefined)

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Debtors</div>
      </div>

      <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
        <input placeholder="Search debtors…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      <div className="sb pb20" style={{ padding: 12 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {(data?.items ?? data)?.map((d: DebtorDto) => (
          <div key={d.id} onClick={() => navigate(`/debtors/${d.id}`)}
            style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🧾</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{d.branchName}{d.phone && ` · ${d.phone}`}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: d.balance > 0 ? '#dc2626' : '#059669' }}>
                ${fmt(d.balance)}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Limit: ${fmt(d.creditLimit)}</div>
            </div>
          </div>
        ))}
        {!isLoading && !data?.items?.length && !data?.length && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>No debtors found</div>
        )}
      </div>
    </div>
  )
}
