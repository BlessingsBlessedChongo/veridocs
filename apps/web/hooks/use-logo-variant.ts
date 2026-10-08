'use client'

import { useTheme } from 'next-themes'
import type { LogoVariant } from '@/components/ui/logo'

type LogoContext = 'on-neutral' | 'on-dark' | 'on-light'

export function useLogoVariant(context: LogoContext = 'on-neutral'): LogoVariant {
  const { resolvedTheme } = useTheme()
  if (context === 'on-dark') return 'mono-light'
  if (context === 'on-light') return 'mono-dark'
  return resolvedTheme === 'dark' ? 'mono-light' : 'primary'
}
