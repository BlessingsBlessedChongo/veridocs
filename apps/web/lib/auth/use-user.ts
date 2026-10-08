'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

export function useUser() {
  const [session, setSession] = React.useState<any>(null)
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sessionValue) => {
      setSession(sessionValue)
      setUser(sessionValue?.user ?? null)
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  return { user, session, loading }
}

export function useRequireUser(redirectTo = '/auth/login') {
  const router = useRouter()
  const { user, loading } = useUser()

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo)
    }
  }, [loading, user, router, redirectTo])

  return { user, loading }
}
