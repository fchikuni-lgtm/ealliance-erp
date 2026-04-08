import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ExpenseStatus, IncomeStatus, EmployeeStatus, PayrollStatus } from '../../types'

// ── Header ────────────────────────────────────────────────────────
export function Header({ title, sub, back, action, actionLabel }:
  { title: string; sub?: string; back?: string; action?: () => void; actionLabel?: string }) {
  const navigate = useNavigate()
  return (
    <div style={{ background: '#0a1628', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0 }}>
      {back && <button onClick={() => navigate(back)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1, fontFamily: 'inherit' }}>←</button>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
      </div>
      {action && <button onClick={action} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{actionLabel}</button>}
    </div>
  )
}

// ── Search bar ────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…', onGo }:
  { value: string; onChange: (v: string) => void; placeholder?: string; onGo?: () => void }) {
  return (
    <div style={{ background: '#0a1628', padding: '8px 12px 12px', flexShrink: 0 }}>
      <div style={{ background: '#1e3a5f', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
        <span style={{ color: '#475569' }}>🔍</span>
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} onKeyDown={e => e.key === 'Enter' && onGo?.()}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, padding: '10px 0', fontFamily: 'inherit' }} />
        {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>✕</button>}
        {onGo && <button onClick={onGo} style={{ background: '#f59e0b', border: 'none', color: '#0a1628', fontWeight: 700, fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Go</button>}
      </div>
    </div>
  )
}

// ── Chip filters ──────────────────────────────────────────────────
export function Chips({ options, active, onChange }:
  { options: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="chips">
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          style={{ border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: active === o.key ? '#0a1628' : '#e5e7eb', color: active === o.key ? '#f59e0b' : '#374151', fontFamily: 'inherit', transition: 'all .18s' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────
export function StatusPill({ status }: { status: string }) {
  const cls = ('pill-' + status.toLowerCase()) as string
  return <span className={cls} style={{ textTransform: 'capitalize' }}>{status}</span>
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 8, cursor: onClick ? 'pointer' : undefined }}>
      {children}
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────
export function Field({ label, children, style }: { label: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inp = { width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 15, background: '#fff', outline: 'none', color: '#111', fontFamily: 'inherit', WebkitAppearance: 'none' as const }

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inp, ...props.style }} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inp, ...props.style }} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inp, minHeight: 80, resize: 'none', ...props.style }} />
}

// ── Button ────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'navy', disabled, full, small }:
  { children: ReactNode; onClick?: () => void; variant?: 'navy'|'gold'|'ghost'|'red'; disabled?: boolean; full?: boolean; small?: boolean }) {
  const bg = { navy: '#0a1628', gold: '#f59e0b', ghost: '#f3f4f6', red: '#fef2f2' }[variant]
  const co = { navy: '#fff', gold: '#0a1628', ghost: '#374151', red: '#dc2626' }[variant]
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: bg, color: co, border: 'none', borderRadius: small ? 10 : 12, padding: small ? '8px 16px' : '14px', fontSize: small ? 13 : 15, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .6 : 1, fontFamily: 'inherit', width: full ? '100%' : undefined, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

// ── Sheet (bottom drawer) ─────────────────────────────────────────
export function Sheet({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '8px 16px 48px' }}>
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '10px auto 16px' }} />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────
export function Empty({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 32px', color: '#9ca3af' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15 }}>{message}</div>
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────
export function Loading() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 60 }}><div className="spinner" /></div>
}

// ── Detail row ────────────────────────────────────────────────────
export function DRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────
export function Timeline({ items }: { items: { action: string; by: string; date: string; notes?: string }[] }) {
  const icon: Record<string, string> = { Created:'✏️', Reviewed:'👁️', Approved:'✅', Paid:'💳', Acquitted:'📝', Audited:'🔍', Flagged:'🚩', 'Flag Removed':'🔓', Rejected:'❌', Reversed:'↩', 'Green Flagged':'🟢' }
  return (
    <div>
      {items.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
          {i < items.length - 1 && <div style={{ position: 'absolute', left: 18, top: 36, bottom: 0, width: 2, background: '#f3f4f6' }} />}
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            {icon[h.action] ?? '📋'}
          </div>
          <div style={{ paddingTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{h.action}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>by {h.by} · {h.date.split('T')[0]}</div>
            {h.notes && <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', padding: '8px 10px', borderRadius: 8, marginTop: 6 }}>{h.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Wizard layout ─────────────────────────────────────────────────
export function WizardLayout({ title, step, totalSteps, stepLabel, children, onBack, onNext, nextLabel = 'Next', submitting }:
  { title: string; step: number; totalSteps: number; stepLabel: string; children: ReactNode; onBack: () => void; onNext: () => void; nextLabel?: string; submitting?: boolean }) {
  return (
    <div className="screen">
      <div style={{ background: '#0a1628', padding: '12px 16px 0', color: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1, fontFamily: 'inherit' }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Step {step + 1} of {totalSteps} — {stepLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12, paddingBottom: 16 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`wbar-step ${i < step ? 'done' : i === step ? 'now' : ''}`} />
          ))}
        </div>
      </div>
      <div className="sb" style={{ padding: '20px 16px' }}>{children}</div>
      <div style={{ padding: '12px 16px', background: '#fff', display: 'flex', gap: 10, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
        {step > 0 && <Btn variant="ghost" onClick={onBack}>Back</Btn>}
        <Btn variant={nextLabel.includes('Submit') || nextLabel.includes('Create') ? 'gold' : 'navy'} onClick={onNext} disabled={submitting} full>
          {submitting ? 'Saving…' : nextLabel}
        </Btn>
      </div>
    </div>
  )
}

// ── Fmt ───────────────────────────────────────────────────────────
export const fmt = (n?: number) => Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const today = () => new Date().toISOString().split('T')[0]

// ── Toast ─────────────────────────────────────────────────────────
export const toast = {
  success: (msg: string) => { const t = document.createElement('div'); t.textContent = msg; t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0a1628;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;pointer-events:none'; document.body.appendChild(t); setTimeout(() => t.remove(), 3000) },
  error: (msg: string) => { const t = document.createElement('div'); t.textContent = msg; t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;pointer-events:none'; document.body.appendChild(t); setTimeout(() => t.remove(), 3000) },
}
