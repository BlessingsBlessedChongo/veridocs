import type { VerificationResult } from './types'

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Finds a document ID in whatever was pasted or scanned: the ID itself, or a verification link. */
export function documentIdFrom(text: string): string | null {
  return UUID.exec(text.trim())?.[0]?.toLowerCase() ?? null
}

const KEY = 'veridocs:last-check'

/** Hands a file check's result to the result page (it lives only in this tab). */
export function rememberCheck(result: VerificationResult) {
  try { sessionStorage.setItem(KEY, JSON.stringify(result)) } catch { /* private mode: the page re-checks by ID */ }
}

export function recallCheck(documentId: string): VerificationResult | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const result = raw ? (JSON.parse(raw) as VerificationResult) : null
    return result?.documentId === documentId ? result : null
  } catch {
    return null
  }
}
