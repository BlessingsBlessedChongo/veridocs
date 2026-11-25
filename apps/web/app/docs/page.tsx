import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicLayout } from '@/components/shared/site-shell'

export const metadata: Metadata = {
  title: 'Developers · VeriDocs',
  description: 'Sign and verify documents from your own systems with the VeriDocs API: API keys, verification endpoints, signed webhooks and offline checks.',
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type Route = [method: string, path: string, what: string]
const groups: Array<[title: string, note: string, routes: Route[]]> = [
  ['Verification (public, no key needed)', 'Anyone may call these, from any website.', [
    ['GET', '/api/documents/verify/{documentId}', 'Check by ID (what the QR code opens)'],
    ['POST', '/api/documents/verify-hash', 'Check by SHA-256 fingerprint: { hash, documentId? }. The file never leaves your system.'],
    ['POST', '/api/documents/verify-upload', 'Check by uploading the PDF (multipart: file, documentId?)'],
    ['GET', '/api/public/institutions/{id}', 'An institution\'s public keys and signed revocation list'],
    ['GET', '/api/health', 'Service health'],
  ]],
  ['Signing (API key or session)', 'Send Authorization: Bearer vd_live_… from your server.', [
    ['POST', '/api/documents/sign', 'Sign one PDF (multipart: file, institutionId, metadata JSON). Returns the signed PDF; its ID is in X-Document-Id.'],
    ['POST', '/api/documents/sign-batch', 'Sign up to 50 PDFs (multipart: institutionId, files…, documents JSON array). Returns a ZIP with manifest.csv.'],
    ['GET', '/api/documents/{documentId}', 'A document\'s details and recent checks'],
    ['POST', '/api/documents/{documentId}/revoke', 'Revoke with a reason: { reason }'],
    ['GET', '/api/institutions/{id}/documents', 'List and search: ?search=&status=&page=&pageSize='],
    ['GET', '/api/institutions/{id}/verifications', 'Every check of your documents'],
  ]],
]

const OUTCOMES: Array<[string, string]> = [
  ['VALID', 'Signed by the institution, unchanged, not revoked, not expired.'],
  ['ALTERED', 'A file was checked and its fingerprint differs from what was signed.'],
  ['NOT_FOUND', 'Nothing with this ID or fingerprint was ever signed.'],
  ['FORGED', 'The stored signature does not match the institution\'s key.'],
  ['REVOKED', 'The institution withdrew it (the reason is included).'],
  ['EXPIRED', 'Past its expiry date.'],
]

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-[13px] leading-relaxed text-slate-100 dark:border-slate-800"><code>{children}</code></pre>
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-24 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{children}</h2>
}

export default function Docs() {
  return (
    <PublicLayout>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[200px_1fr] lg:px-8">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {[['start', 'Quick start'], ['endpoints', 'Endpoints'], ['outcomes', 'Outcomes'], ['webhooks', 'Webhooks'], ['offline', 'Offline checks'], ['security', 'Security']].map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="hover:text-indigo-600">{label}</a></li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 space-y-12">
          <header>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Developers</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Sign and verify from your own systems</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Connect a student records system, land registry or HR system to VeriDocs. Every response is JSON:
              {' '}<code className="text-sm">{'{ success: true, data }'}</code> or <code className="text-sm">{'{ success: false, error: { code, message } }'}</code>.
            </p>
          </header>

          <section className="space-y-4">
            <H2 id="start">Quick start</H2>
            <ol className="list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
              <li>An administrator creates an API key under <strong>API &amp; webhooks</strong> in the dashboard. It is shown once.</li>
              <li>Your server signs a PDF, and gets the signed file back:</li>
            </ol>
            <Code>{`curl -X POST ${API}/api/documents/sign \\
  -H "Authorization: Bearer vd_live_…" \\
  -F "file=@certificate.pdf" \\
  -F "institutionId=<your institution id>" \\
  -F 'metadata={"title":"Bachelor of Science","recipientName":"Chanda Mwale"}' \\
  -o signed-certificate.pdf`}</Code>
            <p className="text-slate-700 dark:text-slate-300">Anyone can then check it, without the file leaving their machine:</p>
            <Code>{`curl -X POST ${API}/api/documents/verify-hash \\
  -H "Content-Type: application/json" \\
  -d "{\\"hash\\":\\"$(sha256sum signed-certificate.pdf | cut -d' ' -f1)\\"}"`}</Code>
          </section>

          <section className="space-y-6">
            <H2 id="endpoints">Endpoints</H2>
            {groups.map(([title, note, routes]) => (
              <div key={title} className="space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm text-slate-500">{note}</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {routes.map(([method, path, what]) => (
                        <tr key={method + path}>
                          <td className="w-20 px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{method}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">{path}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{what}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="text-sm text-slate-500">Account, member, key and webhook management is done by people in the dashboard; API keys cannot do it. The full list is in the <a className="text-indigo-600 hover:underline" href="https://github.com/BlessingsBlessedChongo/veridocs/blob/main/docs/api-reference.md">API reference</a>.</p>
          </section>

          <section className="space-y-4">
            <H2 id="outcomes">Verification outcomes</H2>
            <p className="text-slate-700 dark:text-slate-300">Every check answers with <code>valid</code>, an <code>outcome</code> and a plain-language <code>reason</code>:</p>
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {OUTCOMES.map(([o, text]) => (
                <div key={o} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
                  <dt className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{o}</dt>
                  <dd className="text-sm text-slate-600 dark:text-slate-400">{text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4">
            <H2 id="webhooks">Webhooks</H2>
            <p className="text-slate-700 dark:text-slate-300">
              Hear about <code>document.signed</code>, <code>document.revoked</code> and <code>document.verified</code> as they happen. Each delivery is a JSON POST with
              {' '}<code>X-VeriDocs-Event</code> and <code>X-VeriDocs-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code>. Check the signature with your webhook&apos;s secret before trusting it:
            </p>
            <Code>{`import crypto from 'node:crypto'

export function isGenuine(rawBody, header, secret) {
  const [, t, v1] = /t=(\\d+),v1=([0-9a-f]+)/.exec(header ?? '') ?? []
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false   // reject replays
  const expected = crypto.createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex')
  return v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
}`}</Code>
          </section>

          <section className="space-y-4">
            <H2 id="offline">Offline checks</H2>
            <p className="text-slate-700 dark:text-slate-300">
              <code>GET /api/public/institutions/{'{id}'}</code> returns every public key the institution has used (with the dates each was valid) and its revoked document IDs.
              The revocation list is signed with the institution&apos;s active key, so a cached copy can&apos;t be quietly edited. With it, a document can be checked with no network at all:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-300">
              <li>SHA-256 the PDF and write the result as lowercase hex.</li>
              <li>Verify the document&apos;s RSA-SHA256 (PKCS#1 v1.5) signature over that hex text with the institution&apos;s key.</li>
              <li>Make sure the document&apos;s ID is not in <code>revoked</code>.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <H2 id="security">Security</H2>
            <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
              <li>Documents are never stored: only fingerprints, signatures and the details you enter.</li>
              <li>API keys are stored hashed, belong to one institution and role, and can be revoked at once.</li>
              <li>Private keys are encrypted with AES-256-GCM and used only at the moment of signing.</li>
              <li>Rate limits apply per network and per key; a 429 means wait and try again.</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300">Questions about the model? Read the <a className="text-indigo-600 hover:underline" href="https://github.com/BlessingsBlessedChongo/veridocs#security-model">security model</a>, or <Link href="/verify" className="text-indigo-600 hover:underline">try verifying a document</Link>.</p>
          </section>
        </article>
      </div>
    </PublicLayout>
  )
}
