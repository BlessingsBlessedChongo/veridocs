'use client'

import * as React from 'react'
import { auth } from '@/lib/auth/client'
import { api, ApiError } from '@/lib/api'
import type { Me } from '@/lib/types'

type Status = 'loading' | 'signed-in' | 'signed-out'

interface SessionValue {
  status: Status
  me: Me | null
  /** Set when the API couldn't be reached (as opposed to being signed out). */
  error: string | null
  refresh: () => Promise<void>
  signOut: (everywhere?: boolean) => Promise<void>
}

const SessionContext = React.createContext<SessionValue | null>(null)

/** Knows who is signed in and their institutions; every page reads it through useSession(). */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>('loading')
  const [me, setMe] = React.useState<Me | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!(await auth.token())) {
      setMe(null)
      setStatus('signed-out')
      return
    }
    try {
      setMe(await api.me())
      setError(null)
      setStatus('signed-in')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setMe(null)
        setStatus('signed-out')
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setStatus((s) => (s === 'loading' ? 'signed-out' : s))
      }
    }
  }, [])

  React.useEffect(() => {
    // Syncing with the sign-in system (an external store); refresh() only sets state after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return auth.onChange(() => void refresh())
  }, [refresh])

  const signOut = React.useCallback(async (everywhere = false) => {
    await auth.signOut(everywhere)
    setMe(null)
    setStatus('signed-out')
  }, [])

  const value = React.useMemo(() => ({ status, me, error, refresh, signOut }), [status, me, error, refresh, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = React.useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
