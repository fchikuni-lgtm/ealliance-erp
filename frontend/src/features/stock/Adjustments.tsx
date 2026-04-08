// ═══ Adjustments.tsx ══════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdjustments, useCreateAdjustment, useAdjustmentAction, useRevenuePoints } from '../../hooks'
import { StatusPill, fmt } from '../../components/ui'
import { useAuthStore, useRefStore } from '../../store'

type AdjLine = { productId: string; productName: string; quantity: number; direction: 'Increase' | 'Reduce'; reason: string }

function businessDate() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

export default function Adjustments() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useAdjustments({ page })
  const { mutateAsync: create, isPending: creating } = useCreateAdjustment()
  const { mutateAsync: doAction, isPending: actioning } = useAdjustmentAction()

  const [branchId, setBranchId] = useState(user?.branchId ?? '')
  const [rpId, setRpId] = useState('')
  const [date, setDate] = useState(businessDate())
  const [line, setLine] = useState<AdjLine>({ productId: '', productName: '', quantity: 0, direction: 'Increase', reason: '' })

  const { data: rps } = useRevenuePoints(branchId ? { branchId } : undefined)

  async function submit() {
    const product = ref?.products.find(p => p.id === line.productId)
    await create({ branchId, rpId, date, productId: line.productId, quantity: line.quantity, direction: line.direction, reason: line.reason })
    setShowForm(false)
  }

  if (showForm) return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700 }}>New Adjustment</div>
      </div>
      <div className="sb" style={{ padding: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Branch</label>
        <select value={branchId} onChange={e => setBranchId(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
          <option value="">Select…</option>
          {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Revenue Point</label>
        <select value={rpId} onChange={e => setRpId(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
          <option value="">Select…</option>
          {(rps as any[])?.map((rp: any) => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Product</label>
        <select value={line.productId} onChange={e => setLine(l => ({ ...l, productId: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
          <option value="">Select product…</option>
          {ref?.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['Increase', 'Reduce'] as const).map(d => (
            <button key={d} onClick={() => setLine(l => ({ ...l, direction: d }))}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `2px solid ${line.direction === d ? (d === 'Increase' ? '#059669' : '#dc2626') : '#e5e7eb'}`, background: line.direction === d ? (d === 'Increase' ? '#d1fae5' : '#fee2e2') : '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: d === 'Increase' ? '#065f46' : '#991b1b' }}>
              {d === 'Increase' ? '▲ Increase' : '▼ Reduce'}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Quantity</label>
        <input type="number" min="1" value={line.quantity || ''}
          onChange={e => setLine(l => ({ ...l, quantity: Number(e.target.value) }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Reason</label>
        <input value={line.reason} onChange={e => setLine(l => ({ ...l, reason: e.target.value }))}
          placeholder="Reason for adjustment…"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        <button disabled={creating || !line.productId || !line.quantity || !branchId || !rpId} onClick={submit}
          style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
          {creating ? 'Submitting…' : 'Submit Adjustment'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Adjustments</div>
        <button onClick={() => setShowForm(true)} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>+ New</button>
      </div>
      <div className="sb pb20" style={{ padding: 12 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}
        {data?.items?.map((adj: any) => (
          <div key={adj.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{adj.adjNumber}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{adj.date} · {adj.branchName} · {adj.rpName}</div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{adj.productName} — {adj.quantity} × {adj.direction}</div>
                {adj.reason && <div style={{ fontSize: 12, color: '#9ca3af' }}>{adj.reason}</div>}
              </div>
              <StatusPill status={adj.status} />
            </div>
            {adj.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'Adjuster') && (
              <button disabled={actioning} onClick={() => doAction({ id: adj.id, action: 'approve' })}
                style={{ marginTop: 8, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                Approve
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
