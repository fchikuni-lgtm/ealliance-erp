// ═══ TransferOutWizard.tsx ════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useRefStore } from '../../store'
import { useCreateTransferOut, useRevenuePoints } from '../../hooks'
import type { TransferOutType } from '../../types'

const TYPES: TransferOutType[] = ['Compliment', 'Breakage', 'Ullage', 'Debtor', 'Other']

function businessDate() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

export default function TransferOutWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const { mutateAsync: create, isPending } = useCreateTransferOut()

  const [branchId, setBranchId] = useState(user?.branchId ?? '')
  const [rpId, setRpId] = useState('')
  const [date, setDate] = useState(businessDate())
  const [type, setType] = useState<TransferOutType>('Compliment')
  const [beneficiary, setBeneficiary] = useState('')
  const [lines, setLines] = useState<{ productId: string; quantity: number }[]>([])
  const [search, setSearch] = useState('')
  const [step, setStep] = useState(0)

  const { data: rps } = useRevenuePoints(branchId ? { branchId } : undefined)

  function setQty(productId: string, qty: number) {
    setLines(prev => {
      const ex = prev.find(l => l.productId === productId)
      if (ex) return qty === 0 ? prev.filter(l => l.productId !== productId) : prev.map(l => l.productId === productId ? { ...l, quantity: qty } : l)
      return qty === 0 ? prev : [...prev, { productId, quantity: qty }]
    })
  }
  function getQty(id: string) { return lines.find(l => l.productId === id)?.quantity ?? 0 }

  async function submit() {
    await create({ branchId, rpId, date, type, beneficiaryName: beneficiary, lines })
    navigate('/transfer-outs')
  }

  const steps = [
    <div key="s" style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Transfer Out Setup</div>
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
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>Type</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{ padding: '8px', borderRadius: 8, border: `2px solid ${type === t ? '#0a1628' : '#e5e7eb'}`, background: type === t ? '#0a1628' : '#fff', color: type === t ? '#fff' : '#374151', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
            {t}
          </button>
        ))}
      </div>
      {(type === 'Debtor' || type === 'Compliment' || type === 'Other') && (
        <>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
            {type === 'Debtor' ? 'Debtor Name' : 'Beneficiary / Notes'}
          </label>
          <input value={beneficiary} onChange={e => setBeneficiary(e.target.value)} placeholder="Name…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </>
      )}
    </div>,
    <div key="l" style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Select Products</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{lines.length} items selected</div>
      <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }} />
      {ref?.products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>${p.sellingPrice} sell</div>
          </div>
          <input type="number" min="0" value={getQty(p.id) || ''}
            onChange={e => setQty(p.id, Number(e.target.value))}
            style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, textAlign: 'right', fontFamily: 'inherit' }} />
        </div>
      ))}
    </div>,
  ]

  const canNext = step === 0 ? !!(branchId && rpId && date) : lines.length > 0

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>New Transfer Out</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{step + 1} / {steps.length}</div>
      </div>
      <div style={{ height: 3, background: '#1e3a5f', flexShrink: 0 }}>
        <div style={{ height: '100%', background: '#f59e0b', width: `${((step + 1) / steps.length) * 100}%`, transition: 'width .3s' }} />
      </div>
      <div className="sb">{steps[step]}</div>
      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        {step < steps.length - 1 ? (
          <button disabled={!canNext} onClick={() => setStep(s => s + 1)}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: canNext ? '#0a1628' : '#d1d5db', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canNext ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            Continue
          </button>
        ) : (
          <button disabled={isPending || lines.length === 0} onClick={submit}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isPending ? 'Creating…' : 'Create Transfer Out'}
          </button>
        )}
      </div>
    </div>
  )
}
