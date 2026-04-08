// ═══ StockSheets.tsx — Daily stock position with exact formula ════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useRefStore } from '../../store'
import { useStockSheet, useRevenuePoints } from '../../hooks'
import { fmt } from '../../components/ui'
import type { StockSheetRow } from '../../types'

function businessDate() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

export default function StockSheets() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const [branchId, setBranchId] = useState(user?.branchId ?? '')
  const [rpId, setRpId] = useState('')
  const [date, setDate] = useState(businessDate())

  const { data: rps } = useRevenuePoints(branchId ? { branchId } : undefined)
  const { data: rows, isLoading, isFetching } = useStockSheet(branchId, rpId, date)

  const totalSalesValue = rows?.reduce((s: number, r: StockSheetRow) => s + (r.salesValue ?? 0), 0) ?? 0
  const totalVariance = rows?.reduce((s: number, r: StockSheetRow) => s + ((r.salesValue ?? 0) - (r.theoretical * r.sellingPrice)), 0) ?? 0

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Stock Sheets</div>
        {isFetching && <div className="spinner" style={{ width: 18, height: 18 }} />}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', gap: 8, flexShrink: 0, borderBottom: '1px solid #e5e7eb' }}>
        <select value={branchId} onChange={e => { setBranchId(e.target.value); setRpId('') }}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }}>
          <option value="">Branch…</option>
          {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={rpId} onChange={e => setRpId(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }}>
          <option value="">Rev. Point…</option>
          {(rps as any[])?.map((rp: any) => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }} />
      </div>

      {/* Summary strip */}
      {rows && (
        <div style={{ background: '#0a1628', padding: '10px 16px', display: 'flex', gap: 16, flexShrink: 0 }}>
          <SummaryChip label="Sales Value" value={`$${fmt(totalSalesValue)}`} accent="#f59e0b" />
          <SummaryChip label="Variance" value={`$${fmt(totalVariance)}`} accent={totalVariance >= 0 ? '#10b981' : '#ef4444'} />
          <SummaryChip label="Products" value={String(rows.length)} accent="#60a5fa" />
        </div>
      )}

      {/* Table */}
      <div className="sb" style={{ overflowX: 'auto' }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>}
        {!rows && !isLoading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 40 }}>📊</div>
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>Select branch, revenue point and date</div>
          </div>
        )}
        {rows && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 14 }}>No stock data for this selection</div>
          </div>
        )}
        {rows && rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Product', 'Open', 'SMV In', 'Total', 'Debt', 'Comp', 'Brk', 'Ullage', 'SMV Out', 'Adj', 'Theor.', 'Closing', 'Sold', 'Sales Value'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: StockSheetRow) => (
                <tr key={r.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 140, fontSize: 13 }}>
                    {r.productName}
                    {r.subName && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{r.subName}</div>}
                  </td>
                  <Num v={r.opening} />
                  <Num v={r.smvIn} accent="#10b981" />
                  <Num v={r.total} bold />
                  <Num v={r.debtors} accent="#f59e0b" />
                  <Num v={r.compliments} accent="#f59e0b" />
                  <Num v={r.breakages} accent="#ef4444" />
                  <Num v={r.ullages} accent="#ef4444" />
                  <Num v={r.smvOut} accent="#f59e0b" />
                  <Num v={r.adj} accent={r.adj >= 0 ? '#10b981' : '#ef4444'} />
                  <Num v={r.theoretical} bold />
                  <Num v={r.closing ?? 0} accent="#60a5fa" />
                  <Num v={r.sold ?? 0} bold />
                  <Num v={r.salesValue ?? 0} bold accent="#f59e0b" prefix="$" />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                <td style={{ padding: '10px', fontWeight: 700, fontSize: 13 }}>TOTAL</td>
                {['opening','smvIn','total','debtors','compliments','breakages','ullages','smvOut','adj','theoretical','closing','sold'].map(k => (
                  <td key={k} style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                    {fmt(rows.reduce((s: number, r: any) => s + (r[k] ?? 0), 0))}
                  </td>
                ))}
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                  ${fmt(totalSalesValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}

function SummaryChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div style={{ color: accent, fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function Num({ v, bold, accent, prefix }: { v: number; bold?: boolean; accent?: string; prefix?: string }) {
  return (
    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: bold ? 700 : 400, color: accent ?? '#374151', whiteSpace: 'nowrap' }}>
      {prefix}{v !== 0 ? fmt(v) : <span style={{ color: '#d1d5db' }}>—</span>}
    </td>
  )
}
