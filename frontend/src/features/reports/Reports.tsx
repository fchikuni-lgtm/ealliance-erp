// ═══ src/features/reports/Reports.tsx ════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenseReport } from '../../hooks'
import { useRefStore } from '../../store'
import { Header, Field, Select, Btn, fmt, today } from '../../components/ui'

export default function Reports() {
  const navigate = useNavigate()
  const { data: ref } = useRefStore()
  const now = new Date()
  const [params, setParams] = useState({ branchName:'', regionName:'', categoryName:'', from: new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0], to: today() })
  const [enabled, setEnabled] = useState(false)
  const { data: report, isLoading } = useExpenseReport(params, enabled)
  const set = (k:string, v:string) => setParams(x=>({...x,[k]:v}))

  return (
    <div className="screen">
      <Header title="Expense Report" back="/more" />
      <div className="sb" style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <Field label="Branch"><Select value={params.branchName} onChange={e=>set('branchName',e.target.value)}><option value="">All Branches</option>{ref?.branches.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}</Select></Field>
        <Field label="Region"><Select value={params.regionName} onChange={e=>set('regionName',e.target.value)}><option value="">All Regions</option>{ref?.regions.map(r=><option key={r.id} value={r.name}>{r.name}</option>)}</Select></Field>
        <Field label="Category"><Select value={params.categoryName} onChange={e=>set('categoryName',e.target.value)}><option value="">All Categories</option>{ref?.categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select></Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="From"><input type="date" value={params.from} onChange={e=>set('from',e.target.value)} style={{ width:'100%', padding:'12px 14px', border:'2px solid #e5e7eb', borderRadius:10, fontSize:15, fontFamily:'inherit', outline:'none' }} /></Field>
          <Field label="To"><input type="date" value={params.to} onChange={e=>set('to',e.target.value)} style={{ width:'100%', padding:'12px 14px', border:'2px solid #e5e7eb', borderRadius:10, fontSize:15, fontFamily:'inherit', outline:'none' }} /></Field>
        </div>
        <Btn variant="navy" onClick={() => setEnabled(true)} full>{isLoading ? 'Generating…' : 'Generate Report'}</Btn>
        {report && !isLoading && (
          <div style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#0a1628', marginBottom:14 }}>{report.label}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:8 }}>By Category</div>
            {report.byCategory?.map((c:any) => (
              <div key={c.name} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f3f4f6', fontSize:14 }}>
                <div><div style={{ fontWeight:500 }}>{c.name}</div><div style={{ fontSize:11, color:'#6b7280' }}>{c.count} expense(s)</div></div>
                <span style={{ fontWeight:600 }}>${fmt(c.total)}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', fontSize:15, fontWeight:700, color:'#0a1628' }}>
              <span>TOTAL ({report.expenseCount})</span><span>${fmt(report.grandTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
