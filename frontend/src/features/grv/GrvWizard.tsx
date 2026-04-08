import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateGrv } from '../../hooks'
import { useRefStore } from '../../store'
import { WizardLayout, Field, Input, Select, Btn, DRow, today, fmt } from '../../components/ui'
import { toast } from '../../store'

const STEPS = [
  { lbl:'Supplier',  q:'Who supplied the goods?',  h:'Supplier, receipt and delivery details.' },
  { lbl:'Products',  q:'What goods were received?', h:'Add products. Leave empty for prepay/blank GRV.' },
  { lbl:'Payment',   q:'How was this paid?',        h:'Cash, credit, or prepayment.' },
  { lbl:'Review',    q:'Review & Create GRV',       h:'Confirm before submitting.' },
]

interface Prod { name:string; qty:number; cost:number; cur:string }

export default function GrvWizard() {
  const navigate = useNavigate()
  const create = useCreateGrv()
  const { data: ref } = useRefStore()
  const [step, setStep] = useState(0)
  const [prods, setProds] = useState<Prod[]>([])
  const [np, setNp] = useState({ name:'', qty:'', cost:'', cur:'USD' })
  const [d, setD] = useState({ date:today(), supplierId:'', newSupplierName:'', receiptNumber:'', regionId:'', warehouse:'Main', payType:'Cash', expenseId:'', currency:'USD' })
  const set = (k:string, v:string) => setD(x => ({ ...x, [k]:v }))

  const addProd = () => {
    if (!np.name || !np.qty || !np.cost) { toast.error('Fill name, qty and cost'); return }
    setProds(p => [...p, { name:np.name, qty:parseFloat(np.qty), cost:parseFloat(np.cost), cur:np.cur }])
    setNp({ name:'', qty:'', cost:'', cur:d.currency })
  }

  const validate = () => {
    if (step === 0 && !d.date) { toast.error('Date required'); return false }
    if (step === 0 && !d.supplierId && !d.newSupplierName) { toast.error('Supplier required'); return false }
    if (step === 0 && !d.regionId) { toast.error('Region required'); return false }
    return true
  }

  const submit = async () => {
    try {
      await create.mutateAsync({
        date: d.date, supplierId: d.supplierId || '00000000-0000-0000-0000-000000000000',
        newSupplierName: d.newSupplierName || null, receiptNumber: d.receiptNumber || null,
        regionId: d.regionId, warehouse: d.warehouse,
        payType: d.payType, expenseId: d.expenseId || null, currency: d.currency,
        products: prods.map(p => ({ productName:p.name, quantity:p.qty, unitCost:p.cost, currency:p.cur }))
      })
      navigate('/grv')
    } catch {}
  }

  const totalVal = prods.reduce((s,p) => s + p.qty * p.cost, 0)
  const sup = ref?.suppliers.find(s => s.id === d.supplierId)

  const renderStep = () => {
    switch(step) {
      case 0: return <>
        <Field label="Date *"><Input type="date" value={d.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Supplier *">
          <Select value={d.supplierId} onChange={e => { set('supplierId', e.target.value); set('newSupplierName','') }}>
            <option value="">Select or type new…</option>
            {ref?.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        {!d.supplierId && <Field label="New supplier name"><Input value={d.newSupplierName} onChange={e => set('newSupplierName', e.target.value)} placeholder="Type name…" /></Field>}
        <Field label="Receipt / Invoice No."><Input value={d.receiptNumber} onChange={e => set('receiptNumber', e.target.value)} placeholder="INV-001" /></Field>
        <Field label="Region *">
          <Select value={d.regionId} onChange={e => set('regionId', e.target.value)}>
            <option value="">Select region…</option>
            {ref?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="Warehouse">
          <Select value={d.warehouse} onChange={e => set('warehouse', e.target.value)}>
            <option value="Main">Main Warehouse</option>
            <option value="Branch">Branch Warehouse</option>
          </Select>
        </Field>
      </>
      case 1: return <>
        {prods.length > 0 && prods.map((p,i) => (
          <div key={i} style={{ background:'#f9fafb', borderRadius:10, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div><div style={{ fontWeight:600, fontSize:14 }}>{p.name}</div><div style={{ fontSize:12, color:'#6b7280' }}>{p.qty} × {p.cur}{p.cost} = {p.cur}{fmt(p.qty*p.cost)}</div></div>
            <button onClick={() => setProds(x => x.filter((_,j) => j!==i))} style={{ border:'none', background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        ))}
        <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e5e7eb' }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12, color:'#374151' }}>Add Product</div>
          <Field label="Product Name"><Input value={np.name} onChange={e => setNp(x=>({...x,name:e.target.value}))} list="pdl" placeholder="Search or type…" /><datalist id="pdl">{ref?.products.map(p=><option key={p.id} value={p.name}/>)}</datalist></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <Field label="Qty"><Input type="number" value={np.qty} onChange={e=>setNp(x=>({...x,qty:e.target.value}))} placeholder="0" min="0" /></Field>
            <Field label="Cost"><Input type="number" value={np.cost} onChange={e=>setNp(x=>({...x,cost:e.target.value}))} placeholder="0.00" step="0.01" /></Field>
            <Field label="Currency"><Select value={np.cur} onChange={e=>setNp(x=>({...x,cur:e.target.value}))}>{['USD','ZiG','ZWL'].map(c=><option key={c}>{c}</option>)}</Select></Field>
          </div>
          <Btn variant="ghost" onClick={addProd} full>+ Add Product</Btn>
        </div>
        {prods.length === 0 && <div style={{ marginTop:12, background:'#fff7ed', borderRadius:10, padding:12, fontSize:13, color:'#c2410c' }}>⚠️ No products — this will be a <strong>blank GRV</strong> (prepayment).</div>}
      </>
      case 2: return <>
        <Field label="Payment Type">
          <Select value={d.payType} onChange={e => set('payType', e.target.value)}>
            <option value="Cash">Cash (link to expense)</option>
            <option value="Credit">Credit (no payment yet)</option>
            <option value="Prepay">Prepay (goods to come)</option>
          </Select>
        </Field>
        {d.payType === 'Cash' && <Field label="Expense ID"><Input value={d.expenseId} onChange={e=>set('expenseId',e.target.value.toUpperCase())} placeholder="E001" /></Field>}
        <Field label="Currency"><Select value={d.currency} onChange={e=>set('currency',e.target.value)}>{['USD','ZiG','ZWL'].map(c=><option key={c}>{c}</option>)}</Select></Field>
      </>
      case 3: return (
        <div style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <DRow label="Supplier" value={sup?.name || d.newSupplierName} />
          <DRow label="Date" value={d.date} />
          <DRow label="Receipt" value={d.receiptNumber || 'None'} />
          <DRow label="Region" value={ref?.regions.find(r=>r.id===d.regionId)?.name} />
          <DRow label="Warehouse" value={d.warehouse + ' Warehouse'} />
          <DRow label="Payment" value={d.payType} />
          <DRow label="Products" value={`${prods.length} item(s)`} />
          {prods.length > 0 && <DRow label="Total Value" value={`${d.currency} ${fmt(totalVal)}`} />}
        </div>
      )
    }
  }

  return (
    <WizardLayout title="New GRV" step={step} totalSteps={STEPS.length} stepLabel={STEPS[step].lbl}
      onBack={() => step === 0 ? navigate('/grv') : setStep(s=>s-1)}
      onNext={step < STEPS.length-1 ? () => { if(validate()) setStep(s=>s+1) } : submit}
      nextLabel={step === STEPS.length-1 ? 'Create GRV' : 'Next'}
      submitting={create.isPending}>
      <div style={{ fontSize:20, fontWeight:700, color:'#0a1628', marginBottom:6 }}>{STEPS[step].q}</div>
      <div style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>{STEPS[step].h}</div>
      {renderStep()}
    </WizardLayout>
  )
}
