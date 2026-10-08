import Link from 'next/link'
import { Prose } from '@/components/shared/prose'
export default function P() { return <Prose title="Free forever"><p>One plan, no limits on verification. Everything below is included.</p><ul className="list-disc space-y-1 pl-6"><li>Unlimited public verification</li><li>RSA-2048 signing with key rotation</li><li>Instant revocation</li><li>Full audit trail</li><li>Role-based team access</li></ul><Link href="/auth/signup" className="inline-flex rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Get started</Link></Prose> }
