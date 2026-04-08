import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExpense, useExpenseAction } from '../../hooks'
import { Header, StatusPill, Timeline, Sheet, Field, Textarea, Btn, DRow, Loading, fmt } from '../../components/ui'
import { useAuthStore } from '../../store'

export default function ExpenseDetail() {
  const { number } = useParams<{ number: string }>()
  const navigate = useNavigate()
  const { hasPerm } = useAuthStore()
  const { data: expense, isLoading, refetch } = useExpense(number!)
  const action = useExpenseAction()
  const [sheet, setSheet] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  if (isLoading) return <div className="screen"><Loading /></div>
  if (!expense) return <div className="screen"><div style={{ padding: 32, color: '#9ca3af' }}>Expense not found</div></div>

  const e = expense
  const isFlagged = e.isFlagged

  const doAction = async (act: string) => {
    if ((act === 'reverse' || act === 'flag') && !notes.trim()) {
      alert('Notes are required for this action'); return
    }
    if (act === 'reject' && !notes.trim()) { alert('Rejection reason is required'); return }
    await action.mutateAsync({ number: number!, action: act, notes })
    setSheet(null); setNotes(''); refetch()
  }

  const ActionBtn = ({ label, act, color, bg }: { label: string; act: string; color: string; bg: string }) => (
    <button onClick={() => { setNotes(''); setSheet(act) }}
      style={{ border: 'none', background: bg, color, borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  )

  return (
    <div className="screen">
      <Header title={e.expenseNumber} sub={`${e.branchName} · ${e.categoryName}`} back="/expenses" />

      <div className="sb" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <StatusPill status={e.status} />
          {isFlagged && <span style={{ background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:600, borderRadius:20, padding:'2px 9px' }}>🚩 Flagged</span>}
          {e.isGreenFlagged && <span style={{ background:'#f0fdf4', color:'#16a34a', fontSize:11, fontWeight:600, borderRadius:20, padding:'2px 9px' }}>🟢 Over-supplied</span>}
          {e.isReversed && <span style={{ background:'#fdf4ff', color:'#9333ea', fontSize:11, fontWeight:600, borderRadius:20, padding:'2px 9px' }}>↩ Reversed</span>}
        </div>

        {/* Details */}
        <div style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <DRow label="Date" value={e.date} />
          <DRow label="Value Date" value={e.valueDate} />
          <DRow label="Branch" value={e.branchName} />
          <DRow label="Region" value={e.regionName} />
          <DRow label="Category" value={e.categoryName} />
          <DRow label="Amount" value={`${e.currency} ${fmt(e.amount)}`} />
          <DRow label="Payment Method" value={e.paymentMethodName} />
          <DRow label="Supplier" value={e.supplierName} />
          <DRow label="Workman" value={e.workmanName} />
          <DRow label="Budget ID" value={e.budgetId} />
          <DRow label="Notes" value={e.notes} />
          <DRow label="Created By" value={e.createdByName} />
          <DRow label="Reviewed By" value={e.reviewedByName} />
          <DRow label="Approved By" value={e.approvedByName} />
          <DRow label="Paid By" value={e.paidByName} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {e.status === 'Pending' && !isFlagged && hasPerm('review') &&
            <ActionBtn label="👁 Review" act="review" color="#1d4ed8" bg="#eff6ff" />}
          {e.status === 'Reviewed' && !isFlagged && hasPerm('approve') && <>
            <ActionBtn label="✅ Approve" act="approve" color="#15803d" bg="#f0fdf4" />
            <ActionBtn label="❌ Reject" act="reject" color="#dc2626" bg="#fef2f2" />
          </>}
          {e.status === 'Approved' && !isFlagged && hasPerm('pay') &&
            <ActionBtn label="💳 Pay" act="pay" color="#166534" bg="#dcfce7" />}
          {e.status === 'Paid' && hasPerm('acquit') &&
            <ActionBtn label="📝 Acquit" act="acquit" color="#6d28d9" bg="#f5f3ff" />}
          {e.status === 'Acquitted' && hasPerm('audit') &&
            <ActionBtn label="🔍 Audit" act="audit" color="#374151" bg="#f3f4f6" />}
          {hasPerm('flag') && !isFlagged &&
            <ActionBtn label="🚩 Flag" act="flag" color="#dc2626" bg="#fef2f2" />}
          {hasPerm('unflag') && isFlagged &&
            <ActionBtn label="Remove Flag" act="unflag" color="#374151" bg="#f3f4f6" />}
          {e.status === 'Paid' && !e.isReversed && hasPerm('reverse') &&
            <ActionBtn label="↩ Reverse" act="reverse" color="#9333ea" bg="#fdf4ff" />}
        </div>

        {/* History */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12 }}>History</div>
          <Timeline items={e.history.map((h: { action: string; doneByName: string; createdAt: string; notes?: string }) => ({ action: h.action, by: h.doneByName, date: h.createdAt, notes: h.notes }))} />
        </div>
      </div>

      {/* Action sheet */}
      <Sheet open={!!sheet} onClose={() => { setSheet(null); setNotes('') }}
        title={`${sheet?.charAt(0).toUpperCase()}${sheet?.slice(1)} — ${e.expenseNumber}`}>
        <div style={{ background:'#f9fafb', borderRadius:10, padding:12, marginBottom:16, fontSize:13 }}>
          <div style={{ fontWeight:600 }}>{e.categoryName} — {e.branchName}</div>
          <div style={{ color:'#6b7280', marginTop:4 }}>{e.currency} {fmt(e.amount)}</div>
        </div>
        <Field label={`Notes${sheet === 'reverse' || sheet === 'reject' || sheet === 'flag' ? ' (required)' : ' (optional)'}`}>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter notes…" rows={3} />
        </Field>
        <div style={{ display:'flex', gap:10 }}>
          <Btn variant="ghost" onClick={() => { setSheet(null); setNotes('') }}>Cancel</Btn>
          <Btn variant="gold" onClick={() => doAction(sheet!)} disabled={action.isPending}>
            {action.isPending ? 'Saving…' : 'Confirm'}
          </Btn>
        </div>
      </Sheet>
    </div>
  )
}
