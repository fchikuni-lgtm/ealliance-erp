// ═══ StockCountWizard.tsx — Create stock count ════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useRefStore } from '../../store'
import { useCreateStockCount, useRevenuePoints } from '../../hooks'

type CountItem = { productId: string; productName: string; c1: number; c2: number }

function businessDate() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

export default function StockCountWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const { mutateAsync: createCount, isPending } = useCreateStockCount()

  const [step, setStep] = useState(0)
  const [branchId, setBranchId] = useState(user?.branchId ?? '')
  const [rpId, setRpId] = useState('')
  const [date, setDate] = useState(businessDate())
  const [type, setType] = useState<'Opening' | 'Closing'>('Closing')
  const [method, setMethod] = useState<'C1Only' | 'C1C2' | 'PrevClosing'>('C1Only')
  const [items, setItems] = useState<CountItem[]>([])
  const [search, setSearch] = useState('')

  const { data: rps } = useRevenuePoints(branchId ? { branchId } : undefined)

  const filteredProducts = ref?.products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  function setCount(productId: string, field: 'c1' | 'c2', val: number) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === productId)
      const product = ref?.products.find(p => p.id === productId)
      if (existing) return prev.map(i => i.productId === productId ? { ...i, [field]: val } : i)
      return [...prev, { productId, productName: product?.name ?? '', c1: field === 'c1' ? val : 0, c2: field === 'c2' ? val : 0 }]
    })
  }

  function getItem(productId: string) {
    return items.find(i => i.productId === productId) ?? { c1: 0, c2: 0 }
  }

  async function submit() {
    await createCount({
      branchId, rpId, date, type, method,
      items: items.filter(i => i.c1 > 0 || i.c2 > 0),
    })
    navigate('/stock-counts')
  }

  const steps = [
    // Step 0: Setup
    <div key="setup" style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Count Setup</div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Branch</label>
      <select value={branchId} onChange={e => { setBranchId(e.target.value); setRpId('') }}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        <option value="">Select branch…</option>
        {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Revenue Point</label>
      <select value={rpId} onChange={e => setRpId(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        <option value="">Select revenue point…</option>
        {(rps as any[])?.map((rp: any) => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
      </select>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['Opening', 'Closing'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${type === t ? '#0a1628' : '#e5e7eb'}`, background: type === t ? '#0a1628' : '#fff', color: type === t ? '#fff' : '#374151', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['C1Only', 'C1C2', 'PrevClosing'] as const).map(m => (
          <button key={m} onClick={() => setMethod(m)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${method === m ? '#f59e0b' : '#e5e7eb'}`, background: method === m ? '#fef3c7' : '#fff', color: method === m ? '#92400e' : '#374151', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>
            {m}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Enter counts
    <div key="counts" style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Enter Counts</div>
      <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }} />
      {filteredProducts.map(p => {
        const item = getItem(p.id)
        return (
          <div key={p.id} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{p.name}{p.subName ? ` — ${p.subName}` : ''}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>C1</label>
                <input type="number" min="0" value={item.c1 || ''} onChange={e => setCount(p.id, 'c1', Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15, fontFamily: 'inherit', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
              {method === 'C1C2' && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>C2</label>
                  <input type="number" min="0" value={item.c2 || ''} onChange={e => setCount(p.id, 'c2', Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15, fontFamily: 'inherit', textAlign: 'right', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>,
  ]

  const canProceed = step === 0 ? !!(branchId && rpId && date) : true

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>New Stock Count</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{step + 1} / {steps.length}</div>
      </div>

      {/* Progress */}
      <div style={{ height: 3, background: '#1e3a5f', flexShrink: 0 }}>
        <div style={{ height: '100%', background: '#f59e0b', width: `${((step + 1) / steps.length) * 100}%`, transition: 'width .3s' }} />
      </div>

      <div className="sb">{steps[step]}</div>

      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        {step < steps.length - 1 ? (
          <button disabled={!canProceed} onClick={() => setStep(s => s + 1)}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: canProceed ? '#0a1628' : '#d1d5db', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            Continue
          </button>
        ) : (
          <button disabled={isPending} onClick={submit}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isPending ? 'Saving…' : 'Save Count'}
          </button>
        )}
      </div>
    </div>
  )
}
