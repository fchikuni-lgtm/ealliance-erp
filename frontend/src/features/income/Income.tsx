// ═══ src/features/income/Income.tsx ══════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIncomes, useCreateIncome, useApproveIncome } from '../../hooks'
import { useAuthStore, useRefStore } from '../../store'
import { Header, Chips, Empty, Loading, Sheet, Field, Input, Select, Btn, StatusPill, fmt, today } from '../../components/ui'
import type { IncomeDto } from '../../types'

export default function Income() {
  const navigate = useNavigate()
  const { hasPerm } = useAuthStore()
  const { data: ref } = useRefStore()
  const [filter, setFilter] = useState('all')
  const [sheet, setSheet] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [form, setForm] = useState({ date:today(), source:'', paymentMethodId:'', currency:'USD', amount:'' })
  const set = (k:string,v:string) => setForm(x=>({...x,[k]:v}))
  const params: Record<string,unknown> = filter !== 'all' ? { status:filter } : {}
  const { data = [], isLoading } = useIncomes(params)
  const incomes = data as IncomeDto[]
  const create = useCreateIncome()
  const approve = useApproveIncome()
  const BC: Record<string,string> = { Pending:'#f97316', Approved:'#10b981', Rejected:'#ef4444' }

  const submit = async () => {
    if (!form.source || !form.paymentMethodId || !form.amount) return
    const pm = ref?.paymentMethods.find(p=>p.id===form.paymentMethodId)
    await create.mutateAsync({ date:form.date, source:form.source, paymentMethodId:form.paymentMethodId, currency:pm?.currency??form.currency, amount:parseFloat(form.amount) })
    setSheet(null)
    setForm({ date:today(), source:'', paymentMethodId:'', currency:'USD', amount:'' })
  }

  return (
    <div className="screen">
      <Header title="Income" back="/more" action={() => setSheet('add')} actionLabel="+ Add" />
      <Chips options={[{ key:'all',label:'All' },{ key:'Pending',label:'Pending' },{ key:'Approved',label:'Approved' },{ key:'Rejected',label:'🔴 Rejected' }]} active={filter} onChange={setFilter} />
      <div className="sb">
        <div style={{ padding:'0 12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
          {isLoading && <Loading />}
          {!isLoading && incomes.length === 0 && <Empty icon="💰" message="No income entries" />}
          {incomes.map(i => (
            <div key={i.id} style={{ background:i.status==='Rejected'?'#fff8f8':'#fff', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', borderLeft:`4px solid ${BC[i.status]??'#e5e7eb'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>{i.incomeNumber} · {i.date}</div>
                  <div style={{ fontSize:15, fontWeight:600, marginTop:4 }}>{i.source}</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{i.paymentMethodName}</div>
                  {i.rejectionReason && <div style={{ fontSize:12, color:'#dc2626', marginTop:4 }}>❌ {i.rejectionReason}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:700 }}>{i.currency} {fmt(i.amount)}</div>
                  <StatusPill status={i.status} />
                </div>
              </div>
              {i.status === 'Pending' && hasPerm('income_approve') && (
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <Btn variant="ghost" small onClick={() => approve.mutateAsync({ number:i.incomeNumber, approve:true })}>✅ Approve</Btn>
                  <Btn variant="red" small onClick={() => { setRejectTarget(i.incomeNumber); setSheet('reject') }}>❌ Reject</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <Sheet open={sheet==='add'} onClose={() => setSheet(null)} title="Record Income">
        <Field label="Date"><Input type="date" value={form.date} onChange={e=>set('date',e.target.value)} /></Field>
        <Field label="Source *"><Input value={form.source} onChange={e=>set('source',e.target.value)} placeholder="e.g. Origins Bar Cashup" /></Field>
        <Field label="Payment Method *">
          <Select value={form.paymentMethodId} onChange={e=>set('paymentMethodId',e.target.value)}>
            <option value="">Select…</option>
            {ref?.paymentMethods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Amount *"><Input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" step="0.01" /></Field>
        <div style={{ display:'flex', gap:10 }}>
          <Btn variant="ghost" onClick={()=>setSheet(null)}>Cancel</Btn>
          <Btn variant="gold" onClick={submit} disabled={create.isPending} full>{create.isPending?'Saving…':'Record'}</Btn>
        </div>
      </Sheet>
      <Sheet open={sheet==='reject'} onClose={()=>{setSheet(null);setRejectTarget(null)}} title="Reject Income">
        <Field label="Reason (required)"><Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Enter reason…" /></Field>
        <Btn variant="red" onClick={async()=>{ if(!reason.trim())return; await approve.mutateAsync({number:rejectTarget!,approve:false,reason}); setSheet(null);setRejectTarget(null);setReason('') }} full>Confirm Reject</Btn>
      </Sheet>
    </div>
  )
}
