import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../../hooks'
import { Header, SearchBar, Chips, StatusPill, Empty, Loading, fmt } from '../../components/ui'
import type { ExpenseListDto } from '../../types'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
  { key: 'flagged', label: '🚩 Flagged' },
  { key: 'reversed', label: '↩ Reversed' },
]

const borderColor = (e: ExpenseListDto) => {
  if (e.isFlagged) return '#ef4444'
  return { Pending:'#f97316', Reviewed:'#3b82f6', Approved:'#10b981',
           Paid:'#059669', Acquitted:'#8b5cf6', Audited:'#6b7280', Reversed:'#9333ea' }[e.status] ?? '#e5e7eb'
}

export default function ExpenseListImpl() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const params: Record<string, unknown> = {}
  if (filter === 'flagged') params.isFlagged = true
  else if (filter === 'reversed') params.isReversed = true
  else if (filter !== 'all') params.status = filter
  if (search) params.search = search

  const { data, isLoading } = useExpenses(params)
  const expenses: ExpenseListDto[] = data?.items ?? []

  return (
    <div className="screen">
      <Header title="Expenses" action={() => navigate('/expenses/new')} actionLabel="+ New" />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, category, supplier…" />
      <Chips options={FILTERS} active={filter} onChange={setFilter} />

      <div className="sb pb20">
        <div style={{ padding: '0 12px 16px', display: 'flex', flexDirection: 'column' }}>
          {isLoading && <Loading />}
          {!isLoading && expenses.length === 0 && <Empty icon="📋" message="No expenses found" />}
          {expenses.map(e => (
            <div key={e.id} onClick={() => navigate(`/expenses/${e.expenseNumber}`)}
              style={{ background: e.isFlagged ? '#fff8f8' : '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)', borderLeft: `4px solid ${borderColor(e)}`, overflow: 'hidden', marginBottom: 8, cursor: 'pointer' }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{e.expenseNumber}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{e.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.categoryName}{e.supplierName ? ` — ${e.supplierName}` : ''}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0a1628', flexShrink: 0 }}>{e.currency} {fmt(e.amount)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>📍 {e.branchName} · {e.regionName}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {e.isFlagged && <span style={{ background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:600, borderRadius:20, padding:'2px 8px' }}>🚩</span>}
                    {e.isReversed && <span style={{ background:'#fdf4ff', color:'#9333ea', fontSize:11, fontWeight:600, borderRadius:20, padding:'2px 8px' }}>↩</span>}
                    <StatusPill status={e.status} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => navigate('/expenses/new')}>＋</button>
    </div>
  )
}
