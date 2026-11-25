'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/hooks/use-logo-variant'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // The saved choice is only known in the browser; until then show the default, matching the server.
  const current = useMounted() ? theme ?? 'system' : 'system'

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      {[
        { value: 'light', icon: Sun },
        { value: 'dark', icon: Moon },
        { value: 'system', icon: Monitor },
      ].map(({ value, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant={current === value ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label={`Set theme to ${value}`}
          onClick={() => setTheme(value)}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
      ))}
    </div>
  )
}
