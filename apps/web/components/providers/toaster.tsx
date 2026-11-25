'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'
import { useMounted } from '@/hooks/use-logo-variant'

/** Notifications in the same theme as the rest of the app (light, dark, or the system's). */
export function Toaster() {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  return <Sonner position="bottom-right" richColors closeButton theme={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'} />
}
