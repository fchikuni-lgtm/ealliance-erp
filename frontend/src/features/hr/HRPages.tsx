// ═══ Employees ════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees, useCreateEmployee, usePayroll, useGeneratePayroll, useAttendance, useSaveAttendance } from '../../hooks'
import { useRefStore } from '../../store'
import { Header, SearchBar, Chips, Empty, Loading, WizardLayout, Field, Input, Select, Btn, fmt, today } from '../../components/ui'
import type { EmployeeListDto, AttendanceStatus } from '../../types'

export function Employees() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Active')
  const params: Record<string,unknown> = {}
  if (filter !== 'All') params.status = filter
  if (search) params.search = search
  const { data = [], isLoading } = useEmployees(params)
  const employees = data as EmployeeListDto[]
  const SC: Record<string,string> = { Active:'#10b981', Inactive:'#f97316', Terminated:'#ef4444' }

  return (
    <div className="screen">
      <Header title="Employees" back="/hr" action={() => navigate('/hr/employees/new')} actionLabel="+ New" />
      <SearchBar value={search} onChange={setSearch} placeholder="Search employees…" />
      <Chips options={[{ key:'Active',label:'Active' },{ key:'All',label:'All' },{ key:'Inactive',label:'Inactive' }]} active={filter} onChange={setFilter} />
      <div className="sb pb20">
        <div style={{ padding:'0 12px 16px' }}>
          {isLoading && <Loading />}
          {!isLoading && employees.length === 0 && <Empty icon="👤" message="No employees found" />}
          {employees.map(e=>(
            <div key={e.id} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', marginBottom:8, borderLeft:`4px solid ${SC[e.status]??'#e5e7eb'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'#0a1628', display:'flex', alignItems:'center', justifyContent:'center', color:'#f59e0b', fontSize:16, fontWeight:700, flexShrink:0 }}>
                  {e.fullName.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600 }}>{e.fullName}</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{e.employeeNumber} · {e.branchName}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>{e.position}{e.department?` · ${e.department}`:''}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{e.currency} {fmt(e.grossSalary)}</div>
                  <div style={{ fontSize:11, color:SC[e.status], fontWeight:600, marginTop:2 }}>{e.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button className="fab" onClick={()=>navigate('/hr/employees/new')}>＋</button>
    </div>
  )
}
export default Employees

// ═══ Employee Wizard ══════════════════════════════════════════════
const EMP_STEPS = [
  { lbl:'Personal Info', q:'Who is this employee?',  h:'Full name and contact details.' },
  { lbl:'Job Details',   q:'What is their role?',    h:'Branch, position and start date.' },
  { lbl:'Salary',        q:'What is their salary?',  h:'Gross salary, currency and shift type.' },
  { lbl:'Review',        q:'Review & Save',          h:'Confirm all details.' },
]

export function EmployeeWizard() {
  const navigate = useNavigate()
  const { data: ref } = useRefStore()
  const create = useCreateEmployee()
  const [step, setStep] = useState(0)
  const [d, setD] = useState({ firstName:'', lastName:'', phone:'', idNumber:'', address:'', branchId:'', department:'', position:'', startDate:today(), grossSalary:'', currency:'USD', doubleShiftDefault:false })
  const set = (k:string,v:string|boolean) => setD(x=>({...x,[k]:v}))
  const branch = ref?.branches.find(b=>b.id===d.branchId)

  const submit = async () => {
    try {
      await create.mutateAsync({ firstName:d.firstName, lastName:d.lastName, branchId:d.branchId, department:d.department||null, position:d.position||null, grossSalary:parseFloat(d.grossSalary), currency:d.currency, startDate:d.startDate||null, idNumber:d.idNumber||null, phone:d.phone||null, address:d.address||null, doubleShiftDefault:d.doubleShiftDefault })
      navigate('/hr/employees')
    } catch {}
  }

  const renderStep = () => {
    switch(step) {
      case 0: return <>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Field label="First Name *"><Input value={d.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="First" /></Field>
          <Field label="Last Name *"><Input value={d.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Last" /></Field>
        </div>
        <Field label="Phone"><Input type="tel" value={d.phone} onChange={e=>set('phone',e.target.value)} placeholder="+263…" /></Field>
        <Field label="National ID"><Input value={d.idNumber} onChange={e=>set('idNumber',e.target.value)} /></Field>
        <Field label="Address"><Input value={d.address} onChange={e=>set('address',e.target.value)} /></Field>
      </>
      case 1: return <>
        <Field label="Branch *"><Select value={d.branchId} onChange={e=>set('branchId',e.target.value)}><option value="">Select…</option>{ref?.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Position"><Input value={d.position} onChange={e=>set('position',e.target.value)} placeholder="e.g. Bartender" /></Field>
        <Field label="Department"><Input value={d.department} onChange={e=>set('department',e.target.value)} placeholder="e.g. Operations" /></Field>
        <Field label="Start Date"><Input type="date" value={d.startDate} onChange={e=>set('startDate',e.target.value)} /></Field>
      </>
      case 2: return <>
        <Field label="Gross Monthly Salary *"><Input type="number" value={d.grossSalary} onChange={e=>set('grossSalary',e.target.value)} placeholder="0.00" step="0.01" /></Field>
        <Field label="Currency"><Select value={d.currency} onChange={e=>set('currency',e.target.value)}>{['USD','ZiG','ZWL'].map(c=><option key={c}>{c}</option>)}</Select></Field>
        <div style={{ background:'#f9fafb', borderRadius:10, padding:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div><div style={{ fontSize:14, fontWeight:600 }}>Double Shift Default</div><div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Double pay when marked double shift</div></div>
          <input type="checkbox" checked={d.doubleShiftDefault} onChange={e=>set('doubleShiftDefault',e.target.checked)} style={{ width:20, height:20 }} />
        </div>
      </>
      case 3: return (
        <div style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          {[['Name',`${d.firstName} ${d.lastName}`],['Branch',branch?.name],['Position',d.position],['Start Date',d.startDate],['Gross Salary',`${d.currency} ${fmt(parseFloat(d.grossSalary)||0)}`]].filter(([,v])=>v).map(([l,v])=>(
            <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f3f4f6', fontSize:14 }}><span style={{ color:'#6b7280' }}>{l}</span><span style={{ fontWeight:500 }}>{v}</span></div>
          ))}
        </div>
      )
    }
  }

  return (
    <WizardLayout title="New Employee" step={step} totalSteps={EMP_STEPS.length} stepLabel={EMP_STEPS[step].lbl}
      onBack={()=>step===0?navigate('/hr/employees'):setStep(s=>s-1)}
      onNext={step<EMP_STEPS.length-1?()=>setStep(s=>s+1):submit}
      nextLabel={step===EMP_STEPS.length-1?'Save Employee':'Next'} submitting={create.isPending}>
      <div style={{ fontSize:20, fontWeight:700, color:'#0a1628', marginBottom:6 }}>{EMP_STEPS[step].q}</div>
      <div style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>{EMP_STEPS[step].h}</div>
      {renderStep()}
    </WizardLayout>
  )
}

// ═══ Attendance ════════════════════════════════════════════════════
const ATT_BUTTONS = [
  { key:'Present', label:'Present', bg:'#f0fdf4', color:'#15803d' },
  { key:'Absent', label:'Absent', bg:'#fef2f2', color:'#dc2626' },
  { key:'HalfDay', label:'Half Day', bg:'#fff7ed', color:'#c2410c' },
  { key:'DoubleShift', label:'Double', bg:'#eff6ff', color:'#1d4ed8' },
  { key:'Leave', label:'Leave', bg:'#f5f3ff', color:'#6d28d9' },
]

export function Attendance() {
  const navigate = useNavigate()
  const { data: ref } = useRefStore()
  const [date, setDate] = useState(today())
  const [branchId, setBranchId] = useState('')
  const [attMap, setAttMap] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const save = useSaveAttendance()

  const { data: employees = [], isLoading } = useEmployees(branchId ? { branchId, status:'Active' } : undefined)
  const emps = (employees as EmployeeListDto[])

  const mark = (empId: string, status: AttendanceStatus) =>
    setAttMap(m => ({ ...m, [empId]: m[empId] === status ? (undefined as any) : status }))

  const saveAll = async () => {
    setSaving(true)
    const records = emps.filter(e=>attMap[e.id]).map(e=>({ employeeId:e.id, status:attMap[e.id], notes:null }))
    await save.mutateAsync({ branchId, date, records })
    setSaving(false)
  }

  const marked = emps.filter(e=>attMap[e.id]).length
  const present = emps.filter(e=>attMap[e.id]==='Present'||attMap[e.id]==='DoubleShift').length

  return (
    <div className="screen">
      <Header title="Attendance Register" back="/hr" sub={emps.length>0?`${marked}/${emps.length} marked · ${present} present`:undefined} />
      <div style={{ background:'#0a1628', padding:'8px 12px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ flex:1, background:'#1e3a5f', border:'none', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none' }} />
          <select value={branchId} onChange={e=>setBranchId(e.target.value)} style={{ flex:1, background:'#1e3a5f', border:'none', borderRadius:10, padding:'10px 12px', color:branchId?'#fff':'#475569', fontSize:14, fontFamily:'inherit', outline:'none' }}>
            <option value="">Select Branch…</option>
            {ref?.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {emps.length > 0 && (
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            <button onClick={()=>{ const m: Record<string,AttendanceStatus>= {}; emps.forEach(e=>m[e.id]='Present'); setAttMap(m) }} style={{ flex:1, background:'rgba(16,185,129,.2)', color:'#6ee7b7', border:'none', borderRadius:8, padding:'7px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>All Present</button>
            <button onClick={()=>{ const m: Record<string,AttendanceStatus>= {}; emps.forEach(e=>m[e.id]='Absent'); setAttMap(m) }} style={{ flex:1, background:'rgba(239,68,68,.2)', color:'#fca5a5', border:'none', borderRadius:8, padding:'7px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>All Absent</button>
          </div>
        )}
      </div>
      <div className="sb" style={{ paddingBottom:80 }}>
        {!branchId && <Empty icon="📅" message="Select a branch to load employees" />}
        {isLoading && <Loading />}
        <div style={{ padding:'8px 12px' }}>
          {emps.map(emp=>(
            <div key={emp.id} style={{ background:'#fff', borderRadius:14, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,.07)', marginBottom:8 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{emp.fullName}</div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{emp.employeeNumber} · {emp.position||'Staff'}</div>
              <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                {ATT_BUTTONS.map(ab=>(
                  <button key={ab.key} onClick={()=>mark(emp.id, ab.key as AttendanceStatus)}
                    style={{ border:'none', borderRadius:10, padding:'10px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit', flex:1, minWidth:70, background:ab.bg, color:ab.color, opacity:attMap[emp.id] && attMap[emp.id] !== ab.key ? 0.35 : 1, transform:attMap[emp.id]===ab.key?'scale(1.05)':'scale(1)', transition:'all .15s', fontWeight:attMap[emp.id]===ab.key?800:600 }}>
                    {ab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {emps.length > 0 && (
        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #f3f4f6', flexShrink:0 }}>
          <Btn variant="gold" onClick={saveAll} disabled={saving||save.isPending} full>{saving?'Saving…':`Save Attendance (${marked} marked)`}</Btn>
        </div>
      )}
    </div>
  )
}

// ═══ Payroll ══════════════════════════════════════════════════════
export function Payroll() {
  const navigate = useNavigate()
  const { data: ref } = useRefStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year, setYear] = useState(now.getFullYear())
  const [branchId, setBranchId] = useState('')
  const { data: payroll = [], isLoading } = usePayroll(branchId, month, year)
  const generate = useGeneratePayroll()
  const entries = payroll as any[]
  const total = entries.reduce((s:number,p:any)=>s+p.calculatedPay,0)
  const monthName = new Date(year,month-1).toLocaleString('default',{month:'long'})

  return (
    <div className="screen">
      <Header title="Payroll" back="/hr" sub={`${monthName} ${year}`} />
      <div style={{ background:'#0a1628', padding:'8px 12px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{ flex:1, background:'#1e3a5f', border:'none', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none' }}>
            {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2024,i).toLocaleString('default',{month:'long'})}</option>)}
          </select>
          <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={{ width:80, background:'#1e3a5f', border:'none', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none', textAlign:'center' }} />
        </div>
        <select value={branchId} onChange={e=>setBranchId(e.target.value)} style={{ width:'100%', background:'#1e3a5f', border:'none', borderRadius:10, padding:'10px 12px', color:branchId?'#fff':'#475569', fontSize:14, fontFamily:'inherit', outline:'none' }}>
          <option value="">Select Branch…</option>
          {ref?.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="sb" style={{ paddingBottom:100 }}>
        {!branchId && <Empty icon="💵" message="Select a branch to view payroll" />}
        {isLoading && <Loading />}
        {!isLoading && branchId && (
          <div style={{ padding:'12px 12px 0' }}>
            {entries.length>0 && (
              <div style={{ background:'#0a1628', borderRadius:12, padding:'12px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ color:'#94a3b8', fontSize:13 }}>{entries.length} employees · {monthName} {year}</div>
                <div style={{ color:'#f59e0b', fontWeight:700, fontSize:18 }}>${fmt(total)}</div>
              </div>
            )}
            {entries.length===0 && <Empty icon="📊" message="No payroll generated yet for this period" />}
            {entries.map((p:any)=>(
              <div key={p.id} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:15 }}>{p.fullName}</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{p.employeeNumber}</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>Days: {p.daysWorked}{p.doubleShiftDays>0?` (${p.doubleShiftDays} double)`:''}</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>${fmt(p.grossSalary)} ÷ 30 × {p.daysWorked}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:18, color:'#0a1628' }}>${fmt(p.calculatedPay)}</div>
                    <span style={{ fontSize:11, fontWeight:600, borderRadius:20, padding:'2px 8px', background:p.status==='Paid'?'#dcfce7':p.status==='Approved'?'#f0fdf4':'#fff7ed', color:p.status==='Paid'?'#166534':p.status==='Approved'?'#15803d':'#c2410c' }}>{p.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {branchId && (
        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #f3f4f6', flexShrink:0 }}>
          <Btn variant="navy" onClick={()=>generate.mutateAsync({branchId,month,year})} disabled={generate.isPending} full>
            {generate.isPending?'Generating…':`Generate Payroll — ${monthName} ${year}`}
          </Btn>
        </div>
      )}
    </div>
  )
}
