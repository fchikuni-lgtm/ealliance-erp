// ═══ CloseDay.tsx ═════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useRefStore } from '../../store'
import { useCloseDayStatus, useCloseDay, useReopenDay } from '../../hooks'

function businessDate() {
  const now = new Date()
  if (now.getHours() < 6) now.setDate(now.getDate() - 1)
  return now.toISOString().slice(0, 10)
}

export default function CloseDay() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const [branchId, setBranchId] = useState(user?.branchId ?? '')
  const [date, setDate] = useState(businessDate())
  const [notes, setNotes] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)

  const { data: status, isLoading } = useCloseDayStatus(branchId, date)
  const { mutateAsync: closeDay, isPending: closing } = useCloseDay()
  const { mutateAsync: reopenDay, isPending: reopening } = useReopenDay()

  const isClosed = status?.isClosed
  const canClose = status?.canClose
  const checks = status?.checks ?? []

  async function handleClose() {
    await closeDay({ branchId, date, notes })
    setConfirmClose(false)
  }

  async function handleReopen() {
    if (!reopenReason.trim()) return
    await reopenDay({ branchId, date, reason: reopenReason })
    setReopenReason('')
  }

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Close Day</div>
      </div>

      {/* Selectors */}
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, flexShrink: 0 }}>
        <select value={branchId} onChange={e => setBranchId(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }}>
          <option value="">Branch…</option>
          {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }} />
      </div>

      <div className="sb pb20" style={{ padding: 16 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>}

        {/* Status badge */}
        {status && (
          <div style={{ background: isClosed ? '#d1fae5' : '#fef3c7', borderRadius: 12, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{isClosed ? '🔒' : '🔓'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: isClosed ? '#065f46' : '#92400e', marginTop: 8 }}>
              {isClosed ? 'Day Closed' : 'Day Open'}
            </div>
            {isClosed && status.closedAt && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Closed at {new Date(status.closedAt).toLocaleTimeString()} by {status.closedByName}
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        {checks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>Pre-Close Checklist</div>
            {checks.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', borderRadius: 10, marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <span style={{ fontSize: 18 }}>{c.passed ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</div>
                  {c.detail && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Close / Reopen actions */}
        {status && !isClosed && (
          <>
            {!confirmClose ? (
              <button disabled={!canClose} onClick={() => setConfirmClose(true)}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: canClose ? '#0a1628' : '#d1d5db', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canClose ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginBottom: 8 }}>
                {canClose ? 'Close Day' : 'Cannot Close — Checks Failed'}
              </button>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,.1)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Confirm Close Day</div>
                <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmClose(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button disabled={closing} onClick={handleClose}
                    style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {closing ? 'Closing…' : 'Confirm Close'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {status && isClosed && (user?.role === 'Admin' || user?.role === 'BranchManager') && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,.1)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>Reopen Day</div>
            <input placeholder="Reason for reopening…" value={reopenReason} onChange={e => setReopenReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }} />
            <button disabled={reopening || !reopenReason.trim()} onClick={handleReopen}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {reopening ? 'Reopening…' : 'Reopen Day'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
