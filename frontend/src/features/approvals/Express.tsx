import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpressApproval } from '../../hooks'
import { Header } from '../../components/ui'
import { fmt } from '../../components/ui'

interface Msg { id: number; type: 'sent' | 'recv'; lines?: string[]; loading?: boolean }

export default function Express() {
  const navigate = useNavigate()
  const express = useExpressApproval()
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, type: 'recv', lines: ['Type expense IDs (E001), income IDs (I001) or GRV IDs (G001) — one or many — and press send to instantly approve.'] }
  ])
  const [input, setInput] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight) }, [msgs])

  const addMsg = (msg: Msg) => setMsgs(m => [...m, msg])
  const tnow = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const send = async () => {
    const ids = input.trim().toUpperCase().split(/[\s,]+/).filter(Boolean)
    if (!ids.length) return
    setInput('')

    addMsg({ id: Date.now(), type: 'sent', lines: [ids.join(', ')] })
    const loadId = Date.now() + 1
    addMsg({ id: loadId, type: 'recv', loading: true })

    try {
      const results = await express.mutateAsync(ids)
      setMsgs(m => {
        const copy = [...m]
        const idx = copy.findIndex(x => x.id === loadId)
        if (idx !== -1) {
          copy[idx] = {
            id: Date.now(), type: 'recv',
            lines: results.map((r: any) => r.success ? `✅ ${r.id} — ${r.message}` : `❌ ${r.id} — ${r.message}`)
          }
        }
        return copy
      })
    } catch {
      setMsgs(m => m.map(x => x.id === loadId
        ? { id: Date.now(), type: 'recv' as const, lines: ['❌ Something went wrong. Try again.'] }
        : x))
    }
  }

  return (
    <div className="screen">
      <Header title="Express Approval ⚡" back="/approvals" />

      <div ref={chatRef} className="sb chat-bg" style={{ display: 'flex', flexDirection: 'column', padding: 12, gap: 8 }}>
        {msgs.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'sent' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: msg.type === 'sent' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: msg.type === 'sent' ? '#d4f1c4' : '#fff', boxShadow: msg.type === 'recv' ? '0 1px 2px rgba(0,0,0,.08)' : undefined, fontSize: 14, lineHeight: 1.5 }}>
              {msg.loading
                ? <div style={{ display: 'flex', gap: 4, padding: '4px 0', alignItems: 'center' }}><span className="dot" /><span className="dot" /><span className="dot" /></div>
                : msg.lines?.map((l, i) => <div key={i} style={{ fontWeight: i === 0 && msg.lines!.length > 1 ? 700 : 400, color: '#111' }}>{l}</div>)
              }
              <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 4 }}>{tnow()}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#f0f2f5', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="E001, E002, I003…"
          onKeyDown={e => e.key === 'Enter' && send()}
          style={{ flex: 1, background: '#fff', border: 'none', borderRadius: 24, padding: '10px 16px', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={send} style={{ width: 44, height: 44, borderRadius: '50%', background: '#0a1628', border: 'none', color: '#f59e0b', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
      </div>
    </div>
  )
}
