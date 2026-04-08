import { useState } from 'react'
import { useRefStore } from '../../store'
import { referenceApi, usersApi } from '../../api/client'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Header, Field, Input, Select, Btn, fmt, toast } from '../../components/ui'

const ALL_PERMISSIONS = [
  { key: 'create', label: 'Create' },
  { key: 'review', label: 'Review' },
  { key: 'approve', label: 'Approve' },
  { key: 'pay', label: 'Pay' },
  { key: 'acquit', label: 'Acquit' },
  { key: 'audit', label: 'Audit' },
  { key: 'reverse', label: 'Reverse' },
  { key: 'flag', label: 'Flag' },
  { key: 'unflag', label: 'Unflag' },
  { key: 'income_approve', label: 'Approve Income' },
]

const ROLES = ['Admin', 'AccountsManager', 'Approver', 'Reviewer', 'HrOfficer', 'BranchManager', 'Cashier']

export default function Settings() {
  const { data: ref } = useRefStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('branches')
  const [saving, setSaving] = useState(false)

  // Form states
  const [catName, setCatName] = useState('')
  const [prodCatName, setProdCatName] = useState('')
  const [regionName, setRegionName] = useState('')
  const [branchForm, setBranchForm] = useState({ name: '', regionId: '' })
  const [pmForm, setPmForm] = useState({ name: '', currency: 'USD' })
  const [prodForm, setProdForm] = useState({ name: '', subName: '', costPrice: '', sellingPrice: '', categoryId: '', keywords: '' })
  const [workmanName, setWorkmanName] = useState('')
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'Cashier', branchId: '', permissions: ['create'] as string[] })

  // Users query
  const { data: users = [], refetch: refetchUsers } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll })

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

  const togglePerm = (p: string) => {
    setUserForm(f => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p]
    }))
  }

  const addUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password)
      return toast.error('Name, email, and password are required')
    wrap(
      () => usersApi.create({
        name: userForm.name.trim(), email: userForm.email.trim(),
        password: userForm.password, role: userForm.role,
        permissions: userForm.permissions,
        branchId: userForm.branchId || null
      }),
      'User created',
      () => { setUserForm({ name: '', email: '', password: '', role: 'Cashier', branchId: '', permissions: ['create'] }); refetchUsers() }
    )
  }

  const TABS = [
    { id: 'branches', label: 'Branches' },
    { id: 'regions', label: 'Regions' },
    { id: 'categories', label: 'Expense Cat.' },
    { id: 'prodcats', label: 'Product Cat.' },
    { id: 'products', label: 'Products' },
    { id: 'payment', label: 'Payment' },
    { id: 'workmen', label: 'Workmen' },
    { id: 'users', label: 'Users' },
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
                onKeyDown={e => e.key === 'Enter' && wrap(() => referenceApi.addRegion(regionName.trim()), 'Region added', () => setRegionName(''))} />
            </Field>
            <Btn variant="navy" onClick={() => regionName.trim() && wrap(() => referenceApi.addRegion(regionName.trim()), 'Region added', () => setRegionName(''))} disabled={saving} full>Add Region</Btn>
          </div>
          {ref?.regions.map(r => <div key={r.id} style={listItem}>{r.name}</div>)}
          {!ref?.regions.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No regions yet</div>}
        </>}

        {tab === 'branches' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Branch</div>
            <Field label="Branch Name *">
              <Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Branch" />
            </Field>
            <Field label="Region *">
              <Select value={branchForm.regionId} onChange={e => setBranchForm(f => ({ ...f, regionId: e.target.value }))}>
                <option value="">-- Select region --</option>
                {ref?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            {!ref?.regions.length && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>Add a region first (Regions tab)</div>}
            <Btn variant="navy" onClick={() => {
              if (!branchForm.name.trim() || !branchForm.regionId) return toast.error('Name and region required')
              wrap(() => referenceApi.addBranch(branchForm.name.trim(), branchForm.regionId), 'Branch added', () => setBranchForm({ name: '', regionId: '' }))
            }} disabled={saving || !ref?.regions.length} full>Add Branch</Btn>
          </div>
          {ref?.branches.map(b => <div key={b.id} style={listItem}>{b.name} <span style={{ color: '#9ca3af', fontSize: 12 }}>({b.regionName})</span></div>)}
          {!ref?.branches.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No branches yet</div>}
        </>}

        {tab === 'categories' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Expense Category</div>
            <Field label="Category Name *">
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Utilities"
                onKeyDown={e => e.key === 'Enter' && catName.trim() && wrap(() => referenceApi.addCategory(catName.trim(), 'Expense'), 'Expense category added', () => setCatName(''))} />
            </Field>
            <Btn variant="navy" onClick={() => catName.trim() && wrap(() => referenceApi.addCategory(catName.trim(), 'Expense'), 'Expense category added', () => setCatName(''))} disabled={saving} full>Add Expense Category</Btn>
          </div>
          {ref?.categories.map(c => <div key={c.id} style={listItem}>{c.name}</div>)}
          {!ref?.categories.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No expense categories yet</div>}
        </>}

        {tab === 'prodcats' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Product Category</div>
            <Field label="Category Name *">
              <Input value={prodCatName} onChange={e => setProdCatName(e.target.value)} placeholder="e.g. Beverages"
                onKeyDown={e => e.key === 'Enter' && prodCatName.trim() && wrap(() => referenceApi.addCategory(prodCatName.trim(), 'Product'), 'Product category added', () => setProdCatName(''))} />
            </Field>
            <Btn variant="navy" onClick={() => prodCatName.trim() && wrap(() => referenceApi.addCategory(prodCatName.trim(), 'Product'), 'Product category added', () => setProdCatName(''))} disabled={saving} full>Add Product Category</Btn>
          </div>
          {ref?.productCategories?.map(c => <div key={c.id} style={listItem}>{c.name}</div>)}
          {!ref?.productCategories?.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No product categories yet</div>}
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
            <Field label="Product Category">
              <Select value={prodForm.categoryId} onChange={e => setProdForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">-- No category --</option>
                {ref?.productCategories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Keywords">
              <Input value={prodForm.keywords} onChange={e => setProdForm(f => ({ ...f, keywords: e.target.value }))} placeholder="Comma separated search terms" />
            </Field>
            <Btn variant="navy" onClick={() => {
              if (!prodForm.name.trim()) return toast.error('Product name is required')
              wrap(() => referenceApi.addProduct({
                name: prodForm.name.trim(), subName: prodForm.subName || null,
                costPrice: Number(prodForm.costPrice) || 0, sellingPrice: Number(prodForm.sellingPrice) || 0,
                categoryId: prodForm.categoryId || null, keywords: prodForm.keywords || null,
              }), 'Product added', () => setProdForm({ name: '', subName: '', costPrice: '', sellingPrice: '', categoryId: '', keywords: '' }))
            }} disabled={saving} full>Add Product</Btn>
          </div>
          {ref?.products.map(p => (
            <div key={p.id} style={listItem}>
              <div style={{ fontWeight: 600 }}>{p.name}{p.subName ? ` - ${p.subName}` : ''}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Cost: ${fmt(p.costPrice)} | Sell: ${fmt(p.sellingPrice)}</div>
            </div>
          ))}
          {!ref?.products.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No products yet</div>}
        </>}

        {tab === 'payment' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Payment Method</div>
            <Field label="Name *"><Input value={pmForm.name} onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. USD Cash" /></Field>
            <Field label="Currency"><Select value={pmForm.currency} onChange={e => setPmForm(f => ({ ...f, currency: e.target.value }))}>{['USD', 'ZiG', 'ZWL', 'ZAR'].map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Btn variant="gold" onClick={() => pmForm.name.trim() && wrap(() => referenceApi.addPaymentMethod(pmForm.name.trim(), pmForm.currency), 'Payment method added', () => setPmForm({ name: '', currency: 'USD' }))} disabled={saving} full>Add Method</Btn>
          </div>
          {ref?.paymentMethods.map(p => (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{p.currency}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, fontSize: 16, color: '#0a1628' }}>{p.currency} {fmt(p.balance)}</div><div style={{ fontSize: 11, color: '#6b7280' }}>Balance</div></div>
              </div>
            </div>
          ))}
        </>}

        {tab === 'workmen' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add Workman</div>
            <Field label="Name *">
              <Input value={workmanName} onChange={e => setWorkmanName(e.target.value)} placeholder="e.g. John Smith"
                onKeyDown={e => e.key === 'Enter' && workmanName.trim() && wrap(() => referenceApi.addWorkman(workmanName.trim()), 'Workman added', () => setWorkmanName(''))} />
            </Field>
            <Btn variant="navy" onClick={() => workmanName.trim() && wrap(() => referenceApi.addWorkman(workmanName.trim()), 'Workman added', () => setWorkmanName(''))} disabled={saving} full>Add Workman</Btn>
          </div>
          {ref?.workmen.map(w => <div key={w.id} style={listItem}>{w.name}</div>)}
          {!ref?.workmen.length && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 24, fontSize: 14 }}>No workmen yet</div>}
        </>}

        {tab === 'users' && <>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Add User</div>
            <Field label="Full Name *">
              <Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jane Doe" />
            </Field>
            <Field label="Email *">
              <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@hollies.co.zw" />
            </Field>
            <Field label="Password *">
              <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Role" style={{ flex: 1 }}>
                <Select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Branch" style={{ flex: 1 }}>
                <Select value={userForm.branchId} onChange={e => setUserForm(f => ({ ...f, branchId: e.target.value }))}>
                  <option value="">-- All --</option>
                  {ref?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Permissions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_PERMISSIONS.map(p => (
                  <button key={p.key} onClick={() => togglePerm(p.key)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: '2px solid', cursor: 'pointer', fontFamily: 'inherit',
                      background: userForm.permissions.includes(p.key) ? '#0a1628' : '#fff',
                      color: userForm.permissions.includes(p.key) ? '#f59e0b' : '#6b7280',
                      borderColor: userForm.permissions.includes(p.key) ? '#0a1628' : '#e5e7eb',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Btn variant="navy" onClick={addUser} disabled={saving} full>Create User</Btn>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, marginTop: 8 }}>Active Users ({(users as { id: string; name: string; email: string; role: string; permissions: string[]; branchName?: string }[]).length})</div>
          {(users as { id: string; name: string; email: string; role: string; permissions: string[]; branchName?: string }[]).map(u => (
            <div key={u.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{u.email}</div>
                  {u.branchName && <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.branchName}</div>}
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: u.role === 'Admin' ? '#0a1628' : '#f1f5f9',
                  color: u.role === 'Admin' ? '#f59e0b' : '#374151'
                }}>{u.role}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {u.permissions.map(p => (
                  <span key={p} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#e0f2fe', color: '#0369a1' }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </>}

      </div>
    </div>
  )
}
