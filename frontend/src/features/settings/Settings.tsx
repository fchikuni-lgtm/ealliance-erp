import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRefStore } from '../../store'
import { referenceApi } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Header, Field, Input, Select, Btn, fmt, toast } from '../../components/ui'

export default function Settings() {
  const navigate = useNavigate()
  const { data: ref } = useRefStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('categories')
  const [input, setInput] = useState('')
  const [pmForm, setPmForm] = useState({ name:'', currency:'USD' })
  const [saving, setSaving] = useState(false)

  const refresh = () => qc.invalidateQueries({ queryKey: ['reference'] })

  const addCat = async () => {
    if (!input.trim()) return
    setSaving(true)
    try { await referenceApi.addCategory(input.trim()); toast.success('Category added'); setInput(''); refresh() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  const addBranch = async () => {
    if (!input.trim()) return
    setSaving(true)
    try { await referenceApi.addBranch(input.trim(), ref?.regions[0]?.id ?? ''); toast.success('Branch added'); setInput(''); refresh() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  const addPM = async () => {
    if (!pmForm.name) return
    setSaving(true)
    try { await referenceApi.addPaymentMethod(pmForm.name, pmForm.currency); toast.success('Payment method added'); setPmForm({ name:'', currency:'USD' }); refresh() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  const TABS = [{ id:'categories',label:'Categories' },{ id:'branches',label:'Branches' },{ id:'regions',label:'Regions' },{ id:'payment',label:'Payment Methods' }]

  const inp: React.CSSProperties = { flex:1, padding:'12px 14px', border:'2px solid #e5e7eb', borderRadius:10, fontSize:15, outline:'none', fontFamily:'inherit' }

  return (
    <div className="screen">
      <Header title="Settings" back="/more" />
      <div style={{ background:'#0a1628', display:'flex', overflowX:'auto', borderTop:'1px solid #1e3a5f', flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setInput('') }}
            style={{ padding:'10px 16px', fontSize:13, fontWeight:500, color:tab===t.id?'#f59e0b':'#94a3b8', border:'none', background:'none', whiteSpace:'nowrap', cursor:'pointer', borderBottom:`2px solid ${tab===t.id?'#f59e0b':'transparent'}`, fontFamily:'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="sb" style={{ padding:12 }}>
        {tab === 'categories' && <>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <input style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder="New category name…" onKeyDown={e=>e.key==='Enter'&&addCat()} />
            <Btn variant="navy" onClick={addCat} disabled={saving}>Add</Btn>
          </div>
          {ref?.categories.map(c=><div key={c.id} style={{ background:'#fff', borderRadius:10, padding:'13px 16px', marginBottom:8, fontSize:15, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>🏷️ {c.name}</div>)}
        </>}
        {tab === 'branches' && <>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <input style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder="New branch name…" onKeyDown={e=>e.key==='Enter'&&addBranch()} />
            <Btn variant="navy" onClick={addBranch} disabled={saving}>Add</Btn>
          </div>
          {ref?.branches.map(b=><div key={b.id} style={{ background:'#fff', borderRadius:10, padding:'13px 16px', marginBottom:8, fontSize:15, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>🏢 {b.name} <span style={{ color:'#9ca3af', fontSize:12 }}>· {b.regionName}</span></div>)}
        </>}
        {tab === 'regions' && <>
          {ref?.regions.map(r=><div key={r.id} style={{ background:'#fff', borderRadius:10, padding:'13px 16px', marginBottom:8, fontSize:15, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>📍 {r.name}</div>)}
        </>}
        {tab === 'payment' && <>
          <div style={{ background:'#fff', borderRadius:12, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.04)', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>Add Payment Method</div>
            <Field label="Name *"><Input value={pmForm.name} onChange={e=>setPmForm(f=>({...f,name:e.target.value}))} placeholder="e.g. USD Cash" /></Field>
            <Field label="Currency"><Select value={pmForm.currency} onChange={e=>setPmForm(f=>({...f,currency:e.target.value}))}>{['USD','ZiG','ZWL','ZAR'].map(c=><option key={c}>{c}</option>)}</Select></Field>
            <Btn variant="gold" onClick={addPM} disabled={saving} full>Add Method</Btn>
          </div>
          {ref?.paymentMethods.map(p=>(
            <div key={p.id} style={{ background:'#fff', borderRadius:12, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.04)', marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontWeight:600, fontSize:15 }}>{p.name}</div><div style={{ fontSize:12, color:'#6b7280' }}>{p.currency}</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontWeight:700, fontSize:16, color:'#0a1628' }}>{p.currency} {fmt(p.balance)}</div><div style={{ fontSize:11, color:'#6b7280' }}>Balance</div></div>
              </div>
              <div style={{ display:'flex', gap:16, marginTop:10, paddingTop:10, borderTop:'1px solid #f3f4f6' }}>
                <div><span style={{ fontSize:11, color:'#6b7280' }}>Income</span><br/><span style={{ fontSize:13, fontWeight:600, color:'#15803d' }}>{p.currency} {fmt(p.incomeTotal)}</span></div>
                <div><span style={{ fontSize:11, color:'#6b7280' }}>Expenses</span><br/><span style={{ fontSize:13, fontWeight:600, color:'#dc2626' }}>{p.currency} {fmt(p.expenseTotal)}</span></div>
              </div>
            </div>
          ))}
        </>}
      </div>
    </div>
  )
}
