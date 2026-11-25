'use client'

/**
 * The dashboard's building blocks. Every page uses these, so spacing, colours (light and
 * dark), empty states, errors and confirmations look and behave the same everywhere.
 */
import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Inbox, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { DocumentStatus, InstitutionRole, Outcome } from '@/lib/types'

// ── Page structure ──

export function PageHeader({ title, description, actions, back }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400">
          <ChevronLeft size={16} aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, description, actions, children, className, padded = true }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children !== null && children !== undefined && children !== false && <div className={padded ? 'p-5' : ''}>{children}</div>}
    </section>
  )
}

export function StatCard({ label, value, hint, tone = 'default', icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad'; icon?: React.ReactNode }) {
  const tones = { default: 'text-slate-950 dark:text-white', good: 'text-emerald-600 dark:text-emerald-400', warn: 'text-amber-600 dark:text-amber-400', bad: 'text-rose-600 dark:text-rose-400' }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        {icon}
      </div>
      <p className={cn('mt-2 text-3xl font-semibold tabular-nums tracking-tight', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Controls ──

const buttonBase = 'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'
export const buttonStyles = {
  primary: cn(buttonBase, 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'),
  secondary: cn(buttonBase, 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'),
  ghost: cn(buttonBase, 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'),
  danger: cn(buttonBase, 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'),
  dangerGhost: cn(buttonBase, 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'),
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles; busy?: boolean; size?: 'sm' | 'md' }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', busy, size = 'md', className, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={cn(buttonStyles[variant], size === 'sm' && 'h-8 px-3 text-xs', className)} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>
      {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

export const inputStyles =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60 aria-[invalid=true]:border-rose-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'

export function Field({ label, htmlFor, hint, error, children, optional }: { label: string; htmlFor: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputStyles, className)} {...props} />
})

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputStyles, 'h-auto min-h-24 py-2', className)} {...props} />
})

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(inputStyles, 'pr-8', className)} {...props} />
})

// ── Status ──

const pill = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium'
const tones = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300',
}
export type Tone = keyof typeof tones

export function Pill({ tone = 'slate', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn(pill, tones[tone], className)}>{children}</span>
}

const DOCUMENT_STATUS: Record<DocumentStatus, [Tone, string]> = { ACTIVE: ['green', 'Active'], REVOKED: ['red', 'Revoked'], EXPIRED: ['amber', 'Expired'] }
export function DocumentStatusPill({ status }: { status: DocumentStatus }) {
  const [tone, label] = DOCUMENT_STATUS[status] ?? ['slate', status]
  return <Pill tone={tone}>{label}</Pill>
}

export const OUTCOME: Record<Outcome, [Tone, string]> = {
  VALID: ['green', 'Valid'],
  ALTERED: ['red', 'Altered'],
  NOT_FOUND: ['red', 'Not found'],
  FORGED: ['red', 'Forged'],
  REVOKED: ['amber', 'Revoked'],
  EXPIRED: ['amber', 'Expired'],
}
export function OutcomePill({ outcome }: { outcome: Outcome }) {
  const [tone, label] = OUTCOME[outcome] ?? ['slate', outcome]
  return <Pill tone={tone}>{label}</Pill>
}

export const ROLE_LABEL: Record<InstitutionRole, string> = { ADMIN: 'Administrator', ISSUER: 'Issuer', AUDITOR: 'Auditor', VIEWER: 'Viewer' }
export const ROLE_HELP: Record<InstitutionRole, string> = {
  ADMIN: 'Everything: members, keys, API keys, settings, and signing.',
  ISSUER: 'Sign and revoke documents.',
  AUDITOR: 'Read documents, checks and the audit trail.',
  VIEWER: 'Read documents.',
}

// ── States ──

export function Loading({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
      <div className="mb-3 text-slate-400" aria-hidden>{icon ?? <Inbox size={28} />}</div>
      <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <p className="flex items-center gap-2"><AlertTriangle size={16} aria-hidden />{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function Notice({ tone = 'indigo', children, icon }: { tone?: Tone; children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className={cn('flex gap-2 rounded-lg border p-3 text-sm', tones[tone])}>{icon && <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>}<div>{children}</div></div>
}

// ── Small pieces ──

export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = React.useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          toast.error('Copying is blocked here. Select the text and copy it instead.')
        }
      }}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800', className)}
    >
      {done ? <Check size={14} className="text-emerald-600" aria-hidden /> : <Copy size={14} aria-hidden />}
      {done ? 'Copied' : label}
    </button>
  )
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('break-all font-mono text-xs text-slate-700 dark:text-slate-300', className)}>{children}</span>
}

export function DefinitionList({ items }: { items: Array<[string, React.ReactNode] | null | false> }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      {items.filter(Boolean).map((item) => {
        const [k, v] = item as [string, React.ReactNode]
        return (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="min-w-0 text-slate-900 dark:text-slate-100">{v}</dd>
          </div>
        )
      })}
    </dl>
  )
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return 'Never'
  const seconds = (new Date(date).getTime() - Date.now()) / 1000
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  return 'just now'
}
export function When({ date, withTime = false }: { date: string | Date | null | undefined; withTime?: boolean }) {
  if (!date) return <span className="text-slate-400">—</span>
  const d = new Date(date)
  return <time dateTime={d.toISOString()} title={d.toLocaleString()}>{withTime ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleDateString(undefined, { dateStyle: 'medium' })}</time>
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 pt-4 text-sm text-slate-600 dark:text-slate-400">
      <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}</span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} aria-hidden /></Button>
        <span className="px-2 py-1.5">Page {page} of {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} aria-hidden /></Button>
      </div>
    </nav>
  )
}

/** A table that scrolls sideways on small screens rather than squashing. */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  )
}
export const td = 'px-4 py-3 align-middle text-slate-700 dark:text-slate-300'

// ── Confirmation ──

/**
 * A modal that asks before something serious (revoke, rotate, remove). Built on <dialog>, so
 * focus, Escape and the backdrop behave natively. `confirmText` makes people type a word.
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, children, confirmLabel, danger = true, confirmText, busy,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void | Promise<void>; title: string; children?: React.ReactNode
  confirmLabel: string; danger?: boolean; confirmText?: string; busy?: boolean
}) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = React.useState('')
  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) { setTyped(''); dialog.showModal() }
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current && !busy) onClose() }}
      className="m-auto w-[min(92vw,440px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); void onConfirm() }} className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children && <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">{children}</div>}
        {confirmText && (
          <Field label={`Type ${confirmText} to confirm`} htmlFor="confirm-text">
            <Input id="confirm-text" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} busy={busy} disabled={Boolean(confirmText) && typed.trim() !== confirmText}>{confirmLabel}</Button>
        </div>
      </form>
    </dialog>
  )
}

/**
 * Loads data for a page: loading, error and retry handled, and stale answers ignored (if the
 * page asks again before an earlier request returns, only the latest answer is shown).
 * `deps` are the plain values the load depends on (ids, page number, filters).
 * `reload()` asks again and resolves when the fresh data has arrived.
 */
export function useLoad<T>(load: () => Promise<T>, deps: ReadonlyArray<string | number | boolean | null | undefined>) {
  const [nonce, setNonce] = React.useState(0)
  const key = `${JSON.stringify(deps)}#${nonce}`
  const [state, setState] = React.useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null })
  const latestLoad = React.useRef(load)
  const waiting = React.useRef<Array<() => void>>([])

  React.useEffect(() => {
    latestLoad.current = load
  })

  React.useEffect(() => {
    let current = true
    const settle = (next: { data: T | null; error: string | null }) => {
      if (!current) return
      setState({ key, ...next })
      waiting.current.splice(0).forEach((resolve) => resolve())
    }
    latestLoad.current().then(
      (data) => settle({ data, error: null }),
      (e: unknown) => settle({ data: null, error: e instanceof Error ? e.message : 'Something went wrong' }),
    )
    return () => {
      current = false
    }
  }, [key])

  const reload = React.useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiting.current.push(resolve)
        setNonce((n) => n + 1)
      }),
    [],
  )
  const setData = React.useCallback((data: T) => setState((s) => ({ ...s, data, error: null })), [])
  // While a new request is out, the previous data stays on screen (dimmed by pages that want to).
  return { data: state.data, error: state.key === key || state.error === null ? state.error : null, loading: state.key !== key, reload, setData }
}
