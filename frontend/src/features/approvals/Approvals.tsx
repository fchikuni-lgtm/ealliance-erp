import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePendingApprovals, useExpenseAction, useApproveIncome } from '../../hooks'
import { Header, SearchBar, Chips, Empty, Loading, fmt } from '../../components/ui'
import type { PendingApprovalDto } from '../../types'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'income', label: 'Income' },
]

const ACT_COLOR: Record<string, { bg: string; color: string }> = {
  Review:  { bg: '#eff6ff', color: '#1d4ed8' },
  Approve: { bg: '#f0fdf4', color: '#15803d' },
  Pay:     { bg: '#dcfce7', color: '#166534' },
}

export default function Approvals() {
  const navigate = useNavigate()
  const { data: pending = [], isLoading } = usePendingApprovals()
  const expAction = useExpenseAction()
  const incApprove = useApproveIncome()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const items: PendingApprovalDto[] = (pending as PendingApprovalDto[]).filter(i => {
    if (filter !== 'all' && i.type !== filter) return false
    if (search && !i.id.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAction = async (item: PendingApprovalDto) => {
    if (item.type === 'expense') {
      const actionMap: Record<string, string> = { Review: 'review', Approve: 'approve', Pay: 'pay' }
      await expAction.mutateAsync({ number: item.id, action: actionMap[item.nextAction] ?? item.nextAction.toLowerCase(), notes: 'Via Approvals' })
    } else if (item.type === 'income') {
      await incApprove.mutateAsync({ number: item.id, approve: true })
    }
  }

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Approvals</div>
        <button onClick={() => navigate('/approvals/express')}
          style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Express ⚡
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search or enter ID…" onGo={() => {}} />
      <Chips options={FILTERS} active={filter} onChange={setFilter} />

      <div className="sb pb20" style={{ background: '#e8ddd0' }}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading && <Loading />}
          {!isLoading && items.length === 0 && <Empty icon="✅" message="Nothing pending approval" />}
          {items.map(item => {
            const isExp = expanded === item.id
            const ac = ACT_COLOR[item.nextAction] ?? { bg: '#f0fdf4', color: '#15803d' }
            return (
              <div key={item.id} onClick={() => setExpanded(isExp ? null : item.id)}
                style={{ background: '#fff', borderRadius: 12, padding: '13px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {item.type === 'expense' ? '📋' : item.type === 'income' ? '💰' : '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.id} — {item.description}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {item.location}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0a1628' }}>{item.currency} {fmt(item.amount)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.date}</div>
                  </div>
                </div>
                {isExp && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={e => { e.stopPropagation(); navigate(item.type === 'expense' ? `/expenses/${item.id}` : '/income') }}
                        style={{ border: 'none', background: '#f3f4f6', color: '#374151', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        View
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleAction(item) }}
                        style={{ border: 'none', background: ac.bg, color: ac.color, borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {item.nextAction}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
