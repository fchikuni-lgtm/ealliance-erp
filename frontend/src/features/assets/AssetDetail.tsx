// ═══ AssetDetail.tsx ══════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAsset, useLendAsset, useReturnLending, useMoveAsset, useAssetLocations } from '../../hooks'
import { fmt } from '../../components/ui'
import { assetApi } from '../../api/client'
import { toast } from '../../store'
import { useQueryClient } from '@tanstack/react-query'

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useAsset(id!)
  const { data: locations } = useAssetLocations()
  const { mutateAsync: lend, isPending: lending } = useLendAsset()
  const { mutateAsync: returnAsset, isPending: returning } = useReturnLending()
  const { mutateAsync: move, isPending: moving } = useMoveAsset()

  const [activeTab, setActiveTab] = useState<'info' | 'movements' | 'lendings' | 'damage'>('info')
  const [showLendForm, setShowLendForm] = useState(false)
  const [showMoveForm, setShowMoveForm] = useState(false)
  const [showDamageForm, setShowDamageForm] = useState(false)
  const [lendForm, setLendForm] = useState({ borrowerName: '', expectedReturnDate: '', toLocationId: '' })
  const [moveForm, setMoveForm] = useState({ toLocationId: '', date: new Date().toISOString().slice(0, 10), isCrossBranch: false })
  const [damageDesc, setDamageDesc] = useState('')
  const [stillInService, setStillInService] = useState(true)

  if (isLoading) return <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>
  if (!data) return null

  const a = data.Asset ?? data.asset ?? data
  const currentValue = data.CurrentValue ?? data.currentValue

  async function submitLend() {
    await lend({ assetId: id, ...lendForm })
    setShowLendForm(false)
  }

  async function submitMove() {
    await move({ assetId: id, fromLocationId: a.locationId, ...moveForm })
    setShowMoveForm(false)
  }

  async function submitDamage() {
    try {
      await assetApi.reportDamage({ assetId: id, description: damageDesc, stillInService })
      qc.invalidateQueries({ queryKey: ['asset', id] })
      toast.success('Damage reported')
      setShowDamageForm(false)
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const STATUS_COLOR: Record<string, string> = {
    Active: '#059669', OnLoan: '#2563eb', Damaged: '#dc2626', Sold: '#6b7280', WrittenOff: '#92400e',
  }

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{a.Name ?? a.name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{a.AssetNumber ?? a.assetNumber}</div>
        </div>
        <span style={{ background: STATUS_COLOR[a.Status ?? a.status] ?? '#6b7280', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          {a.Status ?? a.status}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ background: '#fff', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, flexShrink: 0, overflowX: 'auto' }}>
        <ActionBtn label="Move" onClick={() => setShowMoveForm(true)} disabled={moving} />
        {(a.Status ?? a.status) !== 'OnLoan' && <ActionBtn label="Lend" onClick={() => setShowLendForm(true)} disabled={lending} />}
        <ActionBtn label="Damage" onClick={() => setShowDamageForm(true)} color="#fee2e2" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {(['info', 'movements', 'lendings', 'damage'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'none', fontSize: 12, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#0a1628' : '#9ca3af', borderBottom: activeTab === tab ? '2px solid #0a1628' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      <div className="sb pb20" style={{ padding: 16 }}>
        {/* Inline forms */}
        {showLendForm && (
          <div style={{ background: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Lend Asset</div>
            <input placeholder="Borrower name" value={lendForm.borrowerName} onChange={e => setLendForm(f => ({ ...f, borrowerName: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }} />
            <input type="date" value={lendForm.expectedReturnDate} onChange={e => setLendForm(f => ({ ...f, expectedReturnDate: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLendForm(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button disabled={lending || !lendForm.borrowerName || !lendForm.expectedReturnDate} onClick={submitLend}
                style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {lending ? 'Lending…' : 'Confirm Lend'}
              </button>
            </div>
          </div>
        )}

        {showMoveForm && (
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Move Asset</div>
            <select value={moveForm.toLocationId} onChange={e => setMoveForm(f => ({ ...f, toLocationId: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', marginBottom: 8 }}>
              <option value="">Select location…</option>
              {(locations as any[])?.map((l: any) => <option key={l.id} value={l.id}>{'  '.repeat(l.level)}{l.name}</option>)}
            </select>
            <input type="date" value={moveForm.date} onChange={e => setMoveForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
              <input type="checkbox" checked={moveForm.isCrossBranch} onChange={e => setMoveForm(f => ({ ...f, isCrossBranch: e.target.checked }))} />
              Cross-branch move
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowMoveForm(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button disabled={moving || !moveForm.toLocationId} onClick={submitMove}
                style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: '#0a1628', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {moving ? 'Moving…' : 'Confirm Move'}
              </button>
            </div>
          </div>
        )}

        {showDamageForm && (
          <div style={{ background: '#fee2e2', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Report Damage</div>
            <textarea value={damageDesc} onChange={e => setDamageDesc(e.target.value)} placeholder="Describe the damage…"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box', minHeight: 80, resize: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
              <input type="checkbox" checked={stillInService} onChange={e => setStillInService(e.target.checked)} />
              Asset still in service (cosmetic damage only)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDamageForm(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button disabled={!damageDesc.trim()} onClick={submitDamage}
                style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Report
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'info' && (
          <div>
            <InfoRow label="Value" value={`$${fmt(a.Value ?? a.value)}`} />
            <InfoRow label="Current Value" value={`$${fmt(currentValue ?? 0)}`} accent="#059669" />
            <InfoRow label="Depreciation" value={`${a.DepreciationPct ?? a.depreciationPct}% / year`} />
            <InfoRow label="Quantity" value={String(a.Quantity ?? a.quantity)} />
            <InfoRow label="Branch" value={a.Branch?.Name ?? a.branchName} />
            <InfoRow label="Location" value={a.Location?.Name ?? a.locationName ?? '—'} />
            {(a.SerialNumber ?? a.serialNumber) && <InfoRow label="Serial No." value={a.SerialNumber ?? a.serialNumber} />}
            {(a.ResponsiblePerson ?? a.responsiblePerson) && <InfoRow label="Responsible" value={a.ResponsiblePerson ?? a.responsiblePerson} />}
          </div>
        )}

        {activeTab === 'movements' && (
          <div>
            {(a.Movements ?? a.movements ?? []).map((m: any) => (
              <div key={m.Id ?? m.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.AmvNumber ?? m.amvNumber}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {m.FromLocation?.Name ?? m.fromLocationName ?? '—'} → {m.ToLocation?.Name ?? m.toLocationName ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{m.Date ?? m.date} · {m.Status ?? m.status}</div>
              </div>
            ))}
            {!(a.Movements ?? a.movements)?.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No movements recorded</div>}
          </div>
        )}

        {activeTab === 'lendings' && (
          <div>
            {(a.Lendings ?? a.lendings ?? []).map((l: any) => (
              <div key={l.Id ?? l.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{l.BorrowerName ?? l.borrowerName}</div>
                  <span style={{ fontSize: 11, background: l.Status === 'Active' ? '#dbeafe' : '#d1fae5', color: l.Status === 'Active' ? '#1e40af' : '#065f46', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {l.Status ?? l.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  Expected return: {l.ExpectedReturnDate ?? l.expectedReturnDate}
                  {(l.ReturnedAt ?? l.returnedAt) && ` · Returned: ${(l.ReturnedAt ?? l.returnedAt)?.slice(0, 10)}`}
                </div>
                {(l.Status ?? l.status) === 'Active' && (
                  <button disabled={returning} onClick={() => returnAsset(l.Id ?? l.id)}
                    style={{ marginTop: 6, padding: '4px 12px', borderRadius: 6, border: 'none', background: '#0a1628', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Mark Returned
                  </button>
                )}
              </div>
            ))}
            {!(a.Lendings ?? a.lendings)?.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No lendings recorded</div>}
          </div>
        )}

        {activeTab === 'damage' && (
          <div>
            {(a.Damages ?? a.damages ?? []).map((d: any) => (
              <div key={d.Id ?? d.id} style={{ background: '#fee2e2', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.Description ?? d.description}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {d.ReportedAt ?? d.createdAt?.slice(0, 10)} · {d.StillInService ?? d.stillInService ? 'In service' : 'Out of service'}
                </div>
              </div>
            ))}
            {!(a.Damages ?? a.damages)?.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>No damage reports</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent ?? '#374151' }}>{value}</span>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled, color }: { label: string; onClick: () => void; disabled?: boolean; color?: string }) {
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: color ?? '#f3f4f6', color: '#374151', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0 }}>
      {label}
    </button>
  )
}
