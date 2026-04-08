// ═══ src/features/hr/HRHome.tsx ══════════════════════════════════
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/ui'
const ITEMS = [
  { icon:'👤', label:'Employees',          sub:'View and manage all employees',   bg:'#eff6ff', path:'/hr/employees' },
  { icon:'📅', label:'Attendance Register',sub:'Mark daily attendance',            bg:'#f0fdf4', path:'/hr/attendance' },
  { icon:'💵', label:'Payroll',            sub:'Calculate and approve salaries',  bg:'#fef3c7', path:'/hr/payroll' },
]
export function HRHome() {
  const navigate = useNavigate()
  return (
    <div className="screen">
      <Header title="Job Masters HR" sub="Human Resources System" back="/more" />
      <div className="sb" style={{ padding:12 }}>
        {ITEMS.map(item=>(
          <div key={item.path} onClick={()=>navigate(item.path)} style={{ background:'#fff', borderRadius:12, padding:16, display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,.04)', cursor:'pointer', marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}><div style={{ fontSize:16, fontWeight:700 }}>{item.label}</div><div style={{ fontSize:13, color:'#6b7280', marginTop:3 }}>{item.sub}</div></div>
            <div style={{ color:'#9ca3af', fontSize:20 }}>›</div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default HRHome
