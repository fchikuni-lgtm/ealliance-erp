import { useState } from 'react'
import { useRefStore } from '../../store'
import { referenceApi } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Header, Field, Input, Select, Btn, fmt, toast } from '../../components/ui'

export default function Settings() {
  const { data: ref } = useRefStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('branches')
  const [saving, setSaving] = useState(false)

  // Form states
  const [catName, setCatName] = useState('')
  const [regionName, setRegionName] = useState('')
  const [branchForm, setBranchForm] = useState({ name: '', regionId: '' })
  const [pmForm, setPmForm] = useState({ name: '', currency: 'USD' })
  const [prodForm, setProdForm] = useState({ name: '', subName: '', costPrice: '', sellingPrice: '', categoryId: '', keywords: '' })
  const [workmanName, setWorkmanName] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['reference'] })

  const wrap = async (fn: () => Promise<unknown>, msg: string, resetFn: () => void) => {
    setSaving(true)
    try { await fn(); toast.success(msg); resetFn(); refresh() }
    catch (e: unknown) {
      const axErr = e as { response?: { data?: { message?: string } } }
      toast.error(axErr?.response?.data?.message || 'Failed — check inputs and try again')
    }
    setSaving(false)
  }

  const addRegion = () => {
    if (!regionName.trim()) return
    wrap(() => referenceApi.addRegion(regionName.trim()), 'Region added', () => setRegionName(''))
  }

  const addBranch = () => {
    if (!branchForm.name.trim() || !branchForm.regionId) { toast.error('Name and region are required'); return }
    wrap(() => referenceApi.addBranch(branchForm.name.trim(), branchForm.regionId), 'Branch added', () => setBranchForm({ name: '', regionId: '' }))
  }

  const addCat = () => {
    if (!catName.trim()) return
    wrap(() => referenceApi.addCategory(catName.trim()), 'Category added', () => setCatName(''))
  }

  const addPM = () => {
    if (!pmForm.name.trim()) return
    wrap(() => referenceApi.addPaymentMethod(pmForm.name.trim(), pmForm.currency), 'Payment method added', () => setPmForm({ name: '', currency: 'USD' }))
  }

  const addProduct = () => {
    if (!prodForm.name.trim()) { toast.error('Product name is required'); return }
    wrap(() => referenceApi.addProduct({
      name: prodForm.name.trim(),
      subName: prodForm.subName || null,
      costPrice: Number(prodForm.costPrice) || 0,
      sellingPrice: Number(prodForm.sellingPrice) || 0,
      categoryId: prodForm.categoryId || null,
      keywords: prodForm.keywords || null,
    }), 'Product added', () => setProdForm({ name: '', subName: '', costPrice: '', sellingPrice: '', categoryId: '', keywords: '' }))
  }

  const addWorkman = () => {
    if (!workmanName.trim()) return
    wrap(() => referenceApi.addWorkman(workmanName.trim()), 'Workman added', () => setWorkmanName(''))
  }

  const TABS = [
    { id: 'branches', label: 'Branches' },
    { id: 'regions', label: 'Regions' },
    { id: 'categories', label: 'Categories' },
    { id: 'products', label: 'Products' },
    { id: 'payment', label: 'Payment' },
    { id: 'workmen', label: 'Workmen' },
  ]

  const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 12 }
  const listItem: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '13px 16px', marginBottom: 8, fontSize: 15, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }

  return (
    <div className="screen">
      <Header title="Settings" back="/more" />
      <div style={{ background: '#0a1628', display: 'flex', overflowX: 'auto', borderTop: '1px solid #1e3a5f', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: tab === t.id ? '#f59e0b' : '#94a3b8', border: 'none', background: 'none', whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: `2px solid ${tab === t.id ? '#f59e0b' : 'transparent'}`, fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="sb" style={{ padding: 12 }}>

        {tab === 'regions' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Region</div>
            <Field label="Region Name *">
              <Input value={regionName} onChange={e => setRegionName(e.target.value)} placeholder="e.g. Harare"
                onKeyDown={e => e.key === 'Enter' && addRegion()} />
            </Field>
            <Btn variant="navy" onClick={addRegion} disabled={saving} full>Add Region</Btn>
          </div>
          {ref?.regions.map(r => <div key={r.id} style={listItem}>📍 {r.name}</div>)}
          {!ref?.regions.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No regions yet — add one above</div>}
        </>}

        {tab === 'branches' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Branch</div>
            <Field label="Branch Name *">
              <Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Branch" />
            </Field>
            <Field label="Region *">
              <Select value={branchForm.regionId} onChange={e => setBranchForm(f => ({ ...f, regionId: e.target.value }))}>
                <option value="">— Select region —</option>
                {ref?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            {!ref?.regions.length && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>Add a region first (Regions tab)</div>}
            <Btn variant="navy" onClick={addBranch} disabled={saving || !ref?.regions.length} full>Add Branch</Btn>
          </div>
          {ref?.branches.map(b => <div key={b.id} style={listItem}>🏢 {b.name} <span style={{ color: '#9ca3af', fontSize: 12 }}>· {b.regionName}</span></div>)}
          {!ref?.branches.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No branches yet</div>}
        </>}

        {tab === 'categories' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Category</div>
            <Field label="Category Name *">
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Food & Beverage"
                onKeyDown={e => e.key === 'Enter' && addCat()} />
            </Field>
            <Btn variant="navy" onClick={addCat} disabled={saving} full>Add Category</Btn>
          </div>
          {ref?.categories.map(c => <div key={c.id} style={listItem}>🏷️ {c.name}</div>)}
          {!ref?.categories.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No categories yet</div>}
        </>}

        {tab === 'products' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Product</div>
            <Field label="Product Name *">
              <Input value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Castle Lager 340ml" />
            </Field>
            <Field label="Sub Name">
              <Input value={prodForm.subName} onChange={e => setProdForm(f => ({ ...f, subName: e.target.value }))} placeholder="Optional variant" />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Cost Price *" style={{ flex: 1 }}>
                <Input type="number" value={prodForm.costPrice} onChange={e => setProdForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0.00" />
              </Field>
              <Field label="Selling Price *" style={{ flex: 1 }}>
                <Input type="number" value={prodForm.sellingPrice} onChange={e => setProdForm(f => ({ ...f, sellingPrice: e.target.value }))} placeholder="0.00" />
              </Field>
            </div>
            <Field label="Category">
              <Select value={prodForm.categoryId} onChange={e => setProdForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">— No category —</option>
                {ref?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Keywords">
              <Input value={prodForm.keywords} onChange={e => setProdForm(f => ({ ...f, keywords: e.target.value }))} placeholder="Comma separated search terms" />
            </Field>
            <Btn variant="navy" onClick={addProduct} disabled={saving} full>Add Product</Btn>
          </div>
          {ref?.products.map(p => (
            <div key={p.id} style={listItem}>
              <div style={{ fontWeight: 600 }}>{p.name}{p.subName ? ` — ${p.subName}` : ''}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Cost: ${fmt(p.costPrice)} · Sell: ${fmt(p.sellingPrice)}</div>
            </div>
          ))}
          {!ref?.products.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No products yet</div>}
        </>}

        {tab === 'payment' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Payment Method</div>
            <Field label="Name *"><Input value={pmForm.name} onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. USD Cash" /></Field>
            <Field label="Currency"><Select value={pmForm.currency} onChange={e => setPmForm(f => ({ ...f, currency: e.target.value }))}>{['USD', 'ZiG', 'ZWL', 'ZAR'].map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Btn variant="gold" onClick={addPM} disabled={saving} full>Add Method</Btn>
          </div>
          {ref?.paymentMethods.map(p => (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{p.currency}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, fontSize: 16, color: '#0a1628' }}>{p.currency} {fmt(p.balance)}</div><div style={{ fontSize: 11, color: '#6b7280' }}>Balance</div></div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                <div><span style={{ fontSize: 11, color: '#6b7280' }}>Income</span><br /><span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>{p.currency} {fmt(p.incomeTotal)}</span></div>
                <div><span style={{ fontSize: 11, color: '#6b7280' }}>Expenses</span><br /><span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{p.currency} {fmt(p.expenseTotal)}</span></div>
              </div>
            </div>
          ))}
        </>}

        {tab === 'workmen' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Workman</div>
            <Field label="Name *">
              <Input value={workmanName} onChange={e => setWorkmanName(e.target.value)} placeholder="e.g. John Smith"
                onKeyDown={e => e.key === 'Enter' && addWorkman()} />
            </Field>
            <Btn variant="navy" onClick={addWorkman} disabled={saving} full>Add Workman</Btn>
          </div>
          {ref?.workmen.map(w => <div key={w.id} style={listItem}>👷 {w.name}</div>)}
          {!ref?.workmen.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No workmen yet</div>}
        </>}

      </div>
    </div>
  )
}
