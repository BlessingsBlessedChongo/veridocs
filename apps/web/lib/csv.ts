/** A small, forgiving CSV reader: quoted fields, commas or semicolons, any line endings. */
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '')
  const delimiter = (clean.split('\n')[0].match(/;/g)?.length ?? 0) > (clean.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()))
  if (!header) return []
  const keys = header.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}
