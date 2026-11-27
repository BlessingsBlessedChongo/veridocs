'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type LogoVariant = 'primary' | 'mono-light' | 'mono-dark'
export type LogoSize = number

/**
 * The VeriDocs mark: a document with a folded corner, carrying a tick that is
 * also the letter V. One shape says both "document" and "verified", and it
 * still reads at favicon size.
 *
 * - primary: the indigo tile, for the brand wherever colour is available
 * - mono-light / mono-dark: an outline in one colour, for use on photos or print
 */
export function Logo({ variant = 'primary', size = 24, className, 'aria-label': ariaLabel, 'aria-hidden': ariaHidden }: { variant?: LogoVariant; size?: LogoSize; className?: string; 'aria-label'?: string; 'aria-hidden'?: boolean }) {
  const id = React.useId()
  const page = 'M40 22H69L90 43V92a7 7 0 0 1-7 7H40a7 7 0 0 1-7-7V29a7 7 0 0 1 7-7Z'
  const fold = 'M69 22V36a7 7 0 0 0 7 7H90Z'
  const tick = 'M46 63L58 77L78 52'

  if (variant !== 'primary') {
    const ink = variant === 'mono-light' ? '#F8FAFC' : '#0F172A'
    return (
      <svg viewBox="0 0 120 120" className={cn('shrink-0', className)} width={size} height={size} role="img" aria-label={ariaLabel} aria-hidden={ariaHidden} fill="none">
        <path d={page} stroke={ink} strokeWidth="6" strokeLinejoin="round" />
        <path d={fold} stroke={ink} strokeWidth="6" strokeLinejoin="round" />
        <path d={tick} stroke={ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 120 120" className={cn('shrink-0', className)} width={size} height={size} role="img" aria-label={ariaLabel} aria-hidden={ariaHidden} fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill={`url(#${id})`} />
      <path d={page} fill="#FFFFFF" />
      <path d={fold} fill="#C7D2FE" />
      <path d={tick} stroke="#4338CA" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
