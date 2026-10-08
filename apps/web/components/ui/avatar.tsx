import * as React from 'react'
import { cn } from '@/lib/utils'

export function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-slate-900', className)} {...props} />
}

export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex h-full w-full items-center justify-center rounded-full', className)} {...props} />
}
