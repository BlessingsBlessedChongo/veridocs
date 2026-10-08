'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type LogoVariant = 'primary' | 'mono-light' | 'mono-dark'
export type LogoSize = number

export function Logo({ variant = 'primary', size = 24, className, 'aria-label': ariaLabel, 'aria-hidden': ariaHidden }: { variant?: LogoVariant; size?: LogoSize; className?: string; 'aria-label'?: string; 'aria-hidden'?: boolean }) {
  const stroke = variant === 'mono-light' ? '#F8FAFC' : variant === 'mono-dark' ? '#0F172A' : '#EEF2FF'
  const fill = variant === 'primary' ? '#4F46E5' : 'transparent'
  const key = variant === 'primary' ? '#FFFFFF' : variant === 'mono-light' ? '#F8FAFC' : '#0F172A'

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn('shrink-0', className)}
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      <path
        d="M60 8L92 20V48C92 73 80 92 60 108C40 92 28 73 28 48V20L60 8Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M41 34C41 28 46 24 52 24H68C74 24 79 28 79 34V44C79 50 74 55 68 55H60V73H52V55H44C38 55 33 50 33 44V34H41Z"
        fill={key}
        opacity={0.9}
      />
      <path
        d="M40 48C47 54 53 58 60 58C67 58 73 54 80 48V76C73 82 67 86 60 86C53 86 47 82 40 76V48Z"
        fill={key}
        opacity={0.88}
      />
      <path
        d="M60 44C66 44 71 49 71 55C71 61 66 66 60 66C54 66 49 61 49 55C49 49 54 44 60 44Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
      />
      <path d="M60 50V58" stroke={key} strokeWidth="4" strokeLinecap="round" />
      <path d="M55 54H65" stroke={key} strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
