'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import type { LogoVariant } from '@/components/ui/logo'

type LogoContext = 'on-neutral' | 'on-dark' | 'on-light'

const noSubscription = () => () => {}

/** True once running in the browser (where the chosen theme is known); false while rendering on the server. */
export function useMounted() {
  return React.useSyncExternalStore(noSubscription, () => true, () => false)
}

export function useLogoVariant(context: LogoContext = 'on-neutral'): LogoVariant {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  if (context === 'on-dark') return 'mono-light'
  if (context === 'on-light') return 'mono-dark'
  // The server can't know the theme: render the default first, so the HTML matches, then switch.
  return mounted && resolvedTheme === 'dark' ? 'mono-light' : 'primary'
}
