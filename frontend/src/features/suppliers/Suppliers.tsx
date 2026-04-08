// ═══ src/features/suppliers/Suppliers.tsx ════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuppliers, useUpdateSupplier } from '../../hooks'
import { Header, SearchBar, Chips, Empty, Loading, Sheet, Field, Input, Btn, fmt } from '../../components/ui'
import type { SupplierSummaryDto } from '../../types'

const FILTERS = [{ key:'all',label:'All' },{ key:'Red',label:'🔴 Red Flag' },{ key:'Green',label:'🟢 Green Flag' },{ key:'Orange',label:'🟠 Incomplete' }]
const FLAG_COLOR: Record<string,string> = { Red:'#ef4444', Green:'#10b981', Orange:'#f97316', None:'#e5e7eb' }
const FLAG_BG: Record<string,string> = { Red:'#fff8f8', Green:'#f8fff9', Orange:'#fff8f0', None:'#fff' }

export default function Suppliers() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editSheet, setEditSheet] = useState<SupplierSummaryDto | null>(null)
  const [form, setForm] = useState({ contactPerson:'', phone:'', address:'' })
  const update = useUpdateSupplier()

  const params: Record<string,unknown> = {}
  if (filter !== 'all') params.flag = filter
  if (search) params.search = search
  const { data = [], isLoading } = useSuppliers(params)
  const suppliers = data as SupplierSummaryDto[]

  const save = async () => {
    if (!editSheet) return
    await update.mutateAsync({ id: editSheet.id, data: form })
    setEditSheet(null)
  }

  return (
    <div className="screen">
      <Header title="Suppliers" back="/more" action={() => {}} actionLabel="+ Add" />
      <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers…" />
      <Chips options={FILTERS} active={filter} onChange={setFilter} />
      <div className="sb">
        <div style={{ padding:'0 12px 16px' }}>
          {isLoading && <Loading />}
          {!isLoading && suppliers.length === 0 && <Empty icon="🏪" message="No suppliers found" />}
          {suppliers.map(s => (
            <div key={s.id} style={{ background:FLAG_BG[s.flag]??'#fff', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', borderLeft:`4px solid ${FLAG_COLOR[s.flag]??'#e5e7eb'}`, marginBottom:8 }}
              onClick={() => { setForm({ contactPerson:'', phone:s.phone??'', address:'' }); setEditSheet(s) }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'#0a1628', display:'flex', alignItems:'center', justifyContent:'center', color:'#f59e0b', fontSize:16, fontWeight:700, flexShrink:0 }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600 }}>{s.name}</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{s.phone ?? 'No phone on file'}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:s.balance>0?'#dc2626':s.balance<0?'#16a34a':'#374151' }}>${fmt(Math.abs(s.balance))}</div>
                  <div style={{ fontSize:11, color:'#6b7280' }}>{s.balance>0?'We owe':s.balance<0?'They owe':'Settled'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Sheet open={!!editSheet} onClose={() => setEditSheet(null)} title={`Edit — ${editSheet?.name}`}>
        <Field label="Contact Person"><Input value={form.contactPerson} onChange={e => setForm(f=>({...f,contactPerson:e.target.value}))} /></Field>
        <Field label="Phone"><Input type="tel" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="+263…" /></Field>
        <Field label="Address"><Input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></Field>
        <div style={{ display:'flex', gap:10 }}>
          <Btn variant="ghost" onClick={() => setEditSheet(null)}>Cancel</Btn>
          <Btn variant="gold" onClick={save} disabled={update.isPending} full>Save</Btn>
        </div>
      </Sheet>
    </div>
  )
}
