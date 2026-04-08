// ═══ AssetWizard.tsx — Register a new asset ═══════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useRefStore } from '../../store'
import { useCreateAsset, useAssetLocations } from '../../hooks'

export default function AssetWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ref } = useRefStore()
  const { data: locations } = useAssetLocations()
  const { mutateAsync: create, isPending } = useCreateAsset()

  const [form, setForm] = useState({
    name: '', subName: '', serialNumber: '', keywords: '',
    categoryId: '', branchId: user?.branchId ?? '',
    locationId: '', responsiblePerson: '',
    value: '', depreciationPct: '20', quantity: '1',
    supplierName: '', supplierContact: '', supplierPhone: '', supplierAddress: '',
    accessories: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    await create({
      ...form,
      value: Number(form.value),
      depreciationPct: Number(form.depreciationPct),
      quantity: Number(form.quantity),
      categoryId: form.categoryId || undefined,
      locationId: form.locationId || undefined,
    })
    navigate('/assets')
  }

  const canSubmit = form.name && form.branchId && form.value && Number(form.value) > 0

  return (
    <div className="screen">
      <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 22, cursor: 'pointer', padding: 0 }}>‹</button>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Register Asset</div>
      </div>

      <div className="sb pb20" style={{ padding: 16 }}>
        <Section title="Asset Details">
          <Field label="Name *"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Asset name" style={inputStyle} /></Field>
          <Field label="Sub-name / Model"><input value={form.subName} onChange={e => set('subName', e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
          <Field label="Serial Number"><input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
          <Field label="Keywords"><input value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="Search keywords" style={inputStyle} /></Field>
          <Field label="Category">
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {(ref?.productCategories ?? ref?.categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Location">
          <Field label="Branch *">
            <select value={form.branchId} onChange={e => set('branchId', e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select value={form.locationId} onChange={e => set('locationId', e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {(locations as any[])?.map((l: any) => <option key={l.id} value={l.id}>{'  '.repeat(l.level)}{l.name}</option>)}
            </select>
          </Field>
          <Field label="Responsible Person"><input value={form.responsiblePerson} onChange={e => set('responsiblePerson', e.target.value)} placeholder="Name" style={inputStyle} /></Field>
        </Section>

        <Section title="Valuation">
          <Field label="Value (USD) *"><input type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="Depreciation % / year"><input type="number" min="0" max="100" value={form.depreciationPct} onChange={e => set('depreciationPct', e.target.value)} style={inputStyle} /></Field>
          <Field label="Quantity"><input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} style={inputStyle} /></Field>
        </Section>

        <Section title="Supplier Info">
          <Field label="Supplier Name"><input value={form.supplierName} onChange={e => set('supplierName', e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
          <Field label="Contact Person"><input value={form.supplierContact} onChange={e => set('supplierContact', e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
          <Field label="Phone"><input value={form.supplierPhone} onChange={e => set('supplierPhone', e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
        </Section>

        <Section title="Accessories">
          <Field label="Accessories / Notes"><textarea value={form.accessories} onChange={e => set('accessories', e.target.value)} placeholder="List any accessories or notes…" style={{ ...inputStyle, minHeight: 80, resize: 'none' as any }} /></Field>
        </Section>
      </div>

      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        <button disabled={isPending || !canSubmit} onClick={submit}
          style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: canSubmit ? '#0a1628' : '#d1d5db', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          {isPending ? 'Registering…' : 'Register Asset'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as any,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
