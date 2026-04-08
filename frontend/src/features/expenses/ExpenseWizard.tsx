import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateExpense } from '../../hooks'
import { useRefStore } from '../../store'
import { WizardLayout, Field, Input, Select, Textarea, DRow, today, fmt } from '../../components/ui'
import { toast } from '../../store'

const STEPS = [
  { lbl: 'Basic Info',  q: 'When and where?',        h: 'Date, branch and paying region.' },
  { lbl: 'Category',   q: 'What type of expense?',   h: 'Category, budget ID and type.' },
  { lbl: 'Payee',      q: 'Who is being paid?',       h: 'Supplier, workman and notification.' },
  { lbl: 'Amount',     q: 'How much?',                h: 'Payment method, currency and amount.' },
  { lbl: 'Submit',     q: 'Review & Submit',          h: 'Confirm all details before submitting.' },
]

export default function ExpenseWizard() {
  const navigate = useNavigate()
  const create = useCreateExpense()
  const { data: ref } = useRefStore()
  const [step, setStep] = useState(0)
  const [d, setD] = useState({
    date: today(), valueDate: today(), branchId: '', regionId: '',
    categoryId: '', budgetId: '', expenseType: 'General',
    supplierId: '', newSupplierName: '', workmanId: '',
    paymentMethodId: '', currency: 'USD', amount: '',
    whatsAppNotify: '', notes: ''
  })
  const set = (k: string, v: string) => setD(x => ({ ...x, [k]: v }))

  const validate = () => {
    if (step === 0 && (!d.date || !d.branchId || !d.regionId)) { toast.error('Date, Branch and Region are required'); return false }
    if (step === 1 && !d.categoryId) { toast.error('Select a category'); return false }
    if (step === 3 && (!d.paymentMethodId || !d.amount)) { toast.error('Payment method and amount required'); return false }
    return true
  }

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  const back = () => { if (step === 0) navigate('/expenses'); else setStep(s => s - 1) }

  const submit = async () => {
    try {
      await create.mutateAsync({
        date: d.date, valueDate: d.valueDate,
        branchId: d.branchId, regionId: d.regionId,
        categoryId: d.categoryId, budgetId: d.budgetId || null, expenseType: d.expenseType,
        supplierId: d.supplierId || null, newSupplierName: d.newSupplierName || null,
        workmanId: d.workmanId || null,
        paymentMethodId: d.paymentMethodId, currency: d.currency,
        amount: parseFloat(d.amount),
        whatsAppNotify: d.whatsAppNotify || null, notes: d.notes || null
      })
      navigate('/expenses')
    } catch {}
  }

  const branch = ref?.branches.find(b => b.id === d.branchId)
  const cat = ref?.categories.find(c => c.id === d.categoryId)
  const pm = ref?.paymentMethods.find(p => p.id === d.paymentMethodId)
  const sup = ref?.suppliers?.find(s => s.id === d.supplierId)

  const renderStep = () => {
    switch (step) {
      case 0: return <>
        <Field label="Date *"><Input type="date" value={d.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Value Date"><Input type="date" value={d.valueDate} onChange={e => set('valueDate', e.target.value)} /></Field>
        <Field label="Branch *">
          <Select value={d.branchId} onChange={e => set('branchId', e.target.value)}>
            <option value="">Select branch…</option>
            {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Paying Region *">
          <Select value={d.regionId} onChange={e => set('regionId', e.target.value)}>
            <option value="">Select region…</option>
            {ref?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
      </>
      case 1: return <>
        <Field label="Category *">
          <Select value={d.categoryId} onChange={e => set('categoryId', e.target.value)}>
            <option value="">Select category…</option>
            {ref?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Budget ID (optional)"><Input value={d.budgetId} onChange={e => set('budgetId', e.target.value)} placeholder="e.g. B001" /></Field>
        <Field label="Expense Type">
          <Select value={d.expenseType} onChange={e => set('expenseType', e.target.value)}>
            {['General','Asset','Salary','GrvRelated'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </>
      case 2: return <>
        <Field label="Supplier">
          <Select value={d.supplierId} onChange={e => { set('supplierId', e.target.value); set('newSupplierName', '') }}>
            <option value="">Select or type new below…</option>
            {(ref?.suppliers ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        {!d.supplierId && <Field label="Or type new supplier name"><Input value={d.newSupplierName} onChange={e => set('newSupplierName', e.target.value)} placeholder="New supplier…" /></Field>}
        <Field label="Workman (optional)">
          <Select value={d.workmanId} onChange={e => set('workmanId', e.target.value)}>
            <option value="">None</option>
            {ref?.workmen.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
        <Field label="WhatsApp to notify"><Input type="tel" value={d.whatsAppNotify} onChange={e => set('whatsAppNotify', e.target.value)} placeholder="+263…" /></Field>
      </>
      case 3: return <>
        <Field label="Payment Method *">
          <Select value={d.paymentMethodId} onChange={e => set('paymentMethodId', e.target.value)}>
            <option value="">Select…</option>
            {ref?.paymentMethods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency} {fmt(p.balance)} balance)</option>)}
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={d.currency} onChange={e => set('currency', e.target.value)}>
            {['USD','ZiG','ZWL','ZAR'].map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Amount *"><Input type="number" value={d.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" step="0.01" min="0" /></Field>
        <Field label="Notes"><Textarea value={d.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…" /></Field>
      </>
      case 4: return (
        <div style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <DRow label="Date" value={d.date} />
          <DRow label="Branch" value={branch?.name} />
          <DRow label="Region" value={ref?.regions.find(r => r.id === d.regionId)?.name} />
          <DRow label="Category" value={cat?.name} />
          <DRow label="Supplier" value={sup?.name || d.newSupplierName || '—'} />
          <DRow label="Payment Method" value={pm?.name} />
          <DRow label="Amount" value={`${pm?.currency || d.currency} ${fmt(parseFloat(d.amount) || 0)}`} />
        </div>
      )
    }
  }

  return (
    <WizardLayout
      title="New Expense"
      step={step} totalSteps={STEPS.length} stepLabel={STEPS[step].lbl}
      onBack={back} onNext={step < STEPS.length - 1 ? next : submit}
      nextLabel={step === STEPS.length - 1 ? 'Submit Expense' : 'Next'}
      submitting={create.isPending}>
      <div style={{ fontSize:20, fontWeight:700, color:'#0a1628', marginBottom:6, lineHeight:1.3 }}>{STEPS[step].q}</div>
      <div style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>{STEPS[step].h}</div>
      {renderStep()}
    </WizardLayout>
  )
}
