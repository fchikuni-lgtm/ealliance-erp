// ═══ CashUpWizard.tsx ════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useRefStore } from '../../store'
import { useCreateCashUp } from '../../hooks'

type Entry = { denomination: number; count: number }

function businessDate() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

const USD_DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.01]

export default function CashUpWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const { mutateAsync: create, isPending } = useCreateCashUp()

  const [branchId, setBranchId] = useState(user?.branchId ?? '')
  const [pmId, setPmId] = useState('')
  const [date, setDate] = useState(businessDate())
  const [entries, setEntries] = useState<Entry[]>(USD_DENOMS.map(d => ({ denomination: d, count: 0 })))
  const [step, setStep] = useState(0)

  function setCount(denom: number, count: number) {
    setEntries(prev => prev.map(e => e.denomination === denom ? { ...e, count } : e))
  }

  const totalUsd = entries.reduce((s, e) => s + e.denomination * e.count, 0)

  async function submit() {
    await create({ branchId, paymentMethodId: pmId, date, entries: entries.filter(e => e.count > 0), totalUsd })
    navigate('/cash-up')
  }

  const steps = [
    <div key="s" style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Cash-Up Setup</div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Branch</label>
      <select value={branchId} onChange={e => setBranchId(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        <option value="">Select…</option>
        {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Payment Method (Till)</label>
      <select value={pmId} onChange={e => setPmId(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>
        <option value="">Select…</option>
        {ref?.paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name} ({pm.currency})</option>)}
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
    </div>,
    <div key="c" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Count Denominations</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>${totalUsd.toFixed(2)}</div>
      </div>
      {USD_DENOMS.map(denom => (
        <div key={denom} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ width: 64, fontWeight: 600, fontSize: 14 }}>${denom < 1 ? denom.toFixed(2) : denom}</div>
          <input type="number" min="0"
            value={entries.find(e => e.denomination === denom)?.count || ''}
            onChange={e => setCount(denom, Number(e.target.value))}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, textAlign: 'right', fontFamily: 'inherit' }} />
          <div style={{ width: 72, textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
            = ${((entries.find(e => e.denomination === denom)?.count ?? 0) * denom).toFixed(2)}
          </div>
        </div>
      ))}
    </div>,
  ]

  const canNext = step === 0 ? !!(branchId && pmId && date) : true

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>New Cash-Up</div>
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
          <button disabled={isPending} onClick={submit}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isPending ? 'Saving…' : `Submit Cash-Up — $${totalUsd.toFixed(2)}`}
          </button>
        )}
      </div>
    </div>
  )
}
