// ═══════════════════════════════════════
// src/features/auth/Login.tsx
// ═══════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/client'
import { useAuthStore, toast } from '../../store'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!email || !password) { toast.error('Enter email and password'); return }
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="screen" style={{ background: 'linear-gradient(160deg,#0a1628,#1e3a5f)', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
      <div className="text-center">
        <h1 style={{ color: '#f59e0b', fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>Hollies</h1>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>GRV · Expenses · HR</p>
      </div>
      <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@hollies.co.zw" onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <button onClick={login} disabled={loading}
          style={{ background: '#f59e0b', color: '#0a1628', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
