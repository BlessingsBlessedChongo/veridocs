'use client'
import { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
export function FileDrop({ onFile, file }: { onFile: (f: File) => void; file: File | null }) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const accept = (f?: File) => { if (!f) return; if (f.type !== 'application/pdf') return alert('Only PDF files are accepted.'); if (f.size > 10 * 1024 * 1024) return alert('Maximum file size is 10 MB.'); onFile(f) }
  return (
    <button type="button" onClick={() => ref.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files[0]) }}
      className={`flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${over ? 'scale-[1.02] border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'}`}>
      {file ? <FileText className="text-indigo-600" size={32} strokeWidth={1.5} aria-hidden /> : <Upload className="text-slate-400" size={32} strokeWidth={1.5} aria-hidden />}
      <span className="text-sm font-medium">{file ? file.name : 'Drop a PDF here, or click to browse'}</span>
      <span className="text-xs text-slate-500">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'PDF only, up to 10 MB'}</span>
      <input ref={ref} type="file" accept="application/pdf" className="sr-only" onChange={(e) => accept(e.target.files?.[0])} />
    </button>
  )
}
