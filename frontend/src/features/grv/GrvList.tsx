// ═══ src/features/grv/GrvList.tsx ════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGrvs } from '../../hooks'
import { Header, SearchBar, Chips, Empty, Loading, fmt } from '../../components/ui'

const FILTERS = [{ key:'all',label:'All' },{ key:'blank',label:'🔴 Blank' },{ key:'green',label:'🟢 Over-supplied' },{ key:'normal',label:'✅ Normal' }]

export default function GrvList() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const params: Record<string,unknown> = {}
  if (filter === 'blank') params.status = 'Blank'
  else if (filter === 'green') params.flagged = true
  if (search) params.search = search
  const { data, isLoading } = useGrvs(params)
  const grvs = data?.items ?? []

  return (
    <div className="screen">
      <Header title="GRV — Goods Received" back="/more" action={() => navigate('/grv/new')} actionLabel="+ New" />
      <SearchBar value={search} onChange={setSearch} placeholder="Search GRVs…" />
      <Chips options={FILTERS} active={filter} onChange={setFilter} />
      <div className="sb pb20">
        <div style={{ padding:'0 12px 16px' }}>
          {isLoading && <Loading />}
          {!isLoading && grvs.length === 0 && <Empty icon="📦" message="No GRVs found" />}
          {grvs.map((g: any) => (
            <div key={g.id} style={{ background: g.status==='Blank'?'#fff8f8':g.isGreenFlagged?'#f8fff9':'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,.07)', borderLeft:`4px solid ${g.status==='Blank'?'#ef4444':g.isGreenFlagged?'#10b981':'#0a1628'}`, marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>{g.grvNumber} · {g.date}</div>
                  <div style={{ fontSize:15, fontWeight:600, marginTop:4 }}>{g.supplierName}</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>📍 {g.regionName} · {g.warehouse === 'Main' ? 'Main WH' : 'Branch WH'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{g.currency} {fmt(g.totalValue)}</div>
                  <div style={{ marginTop:4 }}>
                    {g.status==='Blank' && <span style={{ background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:600,borderRadius:20,padding:'2px 8px' }}>🔴 Blank</span>}
                    {g.isGreenFlagged && <span style={{ background:'#f0fdf4',color:'#16a34a',fontSize:11,fontWeight:600,borderRadius:20,padding:'2px 8px' }}>🟢 Over-supplied</span>}
                    {g.status==='Received' && !g.isGreenFlagged && <span style={{ background:'#f0fdf4',color:'#15803d',fontSize:11,fontWeight:600,borderRadius:20,padding:'2px 8px' }}>✅ Received</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => navigate('/grv/new')}>＋</button>
    </div>
  )
}
