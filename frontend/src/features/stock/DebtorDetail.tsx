// ═══ DebtorDetail.tsx ═════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDebtor, useRecordDebtorPayment } from '../../hooks'
import { fmt } from '../../components/ui'

export default function DebtorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: debtor, isLoading } = useDebtor(id!)
  const { mutateAsync: pay, isPending } = useRecordDebtorPayment()

  const [showPayForm, setShowPayForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  async function submitPayment() {
    await pay({ id: id!, data: { amount: Number(amount), notes } })
    setShowPayForm(false)
    setAmount('')
    setNotes('')
  }

  if (isLoading) return <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>
  if (!debtor) return null

  const d = debtor.debtor ?? debtor

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>{d.name}</div>
        <button onClick={() => setShowPayForm(true)} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', padding: '6px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Pay</button>
      </div>

      {/* Summary */}
      <div style={{ background: '#0a1628', padding: '12px 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: '#1e3a5f', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>Balance Owed</div>
            <div style={{ color: d.balance > 0 ? '#ef4444' : '#10b981', fontSize: 20, fontWeight: 800, marginTop: 4 }}>${fmt(d.balance)}</div>
          </div>
          <div style={{ flex: 1, background: '#1e3a5f', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>Credit Limit</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 4 }}>${fmt(d.creditLimit)}</div>
          </div>
        </div>
        {d.phone && <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>📞 {d.phone}</div>}
      </div>

      {/* Payment form */}
      {showPayForm && (
        <div style={{ background: '#fff', padding: 16, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Record Payment</div>
          <input type="number" placeholder="Amount (USD)" value={amount} onChange={e => setAmount(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }} />
          <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowPayForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button disabled={isPending || !amount} onClick={submitPayment}
              style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="sb pb20" style={{ padding: '12px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>Transactions</div>
        {(debtor.transactions ?? []).map((tx: any) => (
          <div key={tx.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,.05)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.type}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{tx.createdAt?.slice(0, 10)}</div>
              {tx.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{tx.notes}</div>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: tx.type === 'Payment' ? '#059669' : '#dc2626' }}>
              {tx.type === 'Payment' ? '-' : '+'}${fmt(Math.abs(tx.amount))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
