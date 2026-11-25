'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CircleCheck, CircleX, Loader2, MailCheck } from 'lucide-react'
import { CenterCard } from '@/components/shared/shell'
import { buttonStyles } from '@/components/app/ui'
import { auth } from '@/lib/auth/client'
import { useSession } from '@/components/providers/session-provider'

/** With ?token=…: confirms the address from the emailed link. Without: "check your inbox". */
function VerifyEmail() {
  const params = useSearchParams()
  const token = params.get('token')
  const { refresh, status } = useSession()
  const [state, setState] = React.useState<'idle' | 'working' | 'done' | 'failed'>(token ? 'working' : 'idle')
  const [error, setError] = React.useState<string | null>(null)
  const ran = React.useRef(false)

  React.useEffect(() => {
    if (!token || ran.current) return
    ran.current = true // the link works once; don't spend it twice in development's double render
    auth.verifyEmail(token)
      .then(async () => { setState('done'); await refresh() })
      .catch((e) => { setError(e.message); setState('failed') })
  }, [token, refresh])

  return (
    <CenterCard>
      <div className="text-center" aria-live="polite">
        {state === 'working' && (<><Loader2 size={40} className="mx-auto animate-spin text-indigo-600" aria-hidden /><h1 className="mt-4 text-xl font-semibold">Confirming your email…</h1></>)}
        {state === 'done' && (
          <>
            <CircleCheck size={44} className="mx-auto text-emerald-600" aria-hidden />
            <h1 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Email confirmed</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">You can now sign documents and accept invitations.</p>
            <Link href={status === 'signed-in' ? '/dashboard' : '/auth/login'} className={`${buttonStyles.primary} mt-6`}>{status === 'signed-in' ? 'Go to the dashboard' : 'Sign in'}</Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <CircleX size={44} className="mx-auto text-rose-600" aria-hidden />
            <h1 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">That link didn&apos;t work</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
            <Link href="/dashboard" className={`${buttonStyles.primary} mt-6`}>Sign in and send a new one</Link>
          </>
        )}
        {state === 'idle' && (
          <>
            <MailCheck size={44} className="mx-auto text-indigo-600" aria-hidden />
            <h1 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Check your email</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              We sent a confirmation link{params.get('email') ? <> to <span className="font-medium">{params.get('email')}</span></> : null}. Open it to activate your account.
            </p>
            <Link className="mt-6 inline-block text-sm text-indigo-600 dark:text-indigo-400" href="/auth/login">Back to sign in</Link>
          </>
        )}
      </div>
    </CenterCard>
  )
}

export default function Page() {
  return (
    <React.Suspense>
      <VerifyEmail />
    </React.Suspense>
  )
}
