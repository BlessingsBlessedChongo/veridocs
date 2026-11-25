'use client'

import * as React from 'react'
import { FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MAX = 10 * 1024 * 1024

function isPdf(f: File) {
  return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
}

/** Accepts PDFs by drag-and-drop or by browsing; refuses anything else with a clear reason. */
export function FileDrop({
  onFiles, file, multiple = false, label, hint, compact = false,
}: {
  onFiles: (files: File[]) => void
  file?: File | null
  multiple?: boolean
  label?: string
  hint?: string
  compact?: boolean
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)

  function accept(list: FileList | null | undefined) {
    const files = Array.from(list ?? [])
    const good = files.filter((f) => {
      if (!isPdf(f)) { toast.error(`${f.name} is not a PDF.`); return false }
      if (f.size > MAX) { toast.error(`${f.name} is larger than 10 MB.`); return false }
      if (f.size === 0) { toast.error(`${f.name} is empty.`); return false }
      return true
    })
    if (good.length) onFiles(multiple ? good : good.slice(0, 1))
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files) }}
      className={cn(
        'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20',
        compact ? 'p-6' : 'p-10',
        over ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-indigo-600 dark:hover:bg-slate-900',
      )}
    >
      {file ? <FileText className="text-indigo-600" size={32} strokeWidth={1.5} aria-hidden /> : <Upload className="text-slate-400" size={32} strokeWidth={1.5} aria-hidden />}
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{file ? file.name : label ?? (multiple ? 'Drop PDFs here, or click to choose' : 'Drop a PDF here, or click to choose')}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{file ? `${Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB · click to change` : hint ?? 'PDF only, up to 10 MB each'}</span>
      <input ref={ref} type="file" accept="application/pdf,.pdf" multiple={multiple} className="sr-only" tabIndex={-1} onChange={(e) => { accept(e.target.files); e.target.value = '' }} />
    </button>
  )
}
