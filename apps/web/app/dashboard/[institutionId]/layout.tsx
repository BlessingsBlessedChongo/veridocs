'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { InstitutionProvider } from '@/components/providers/institution-provider'
import { ErrorState, Loading, buttonStyles, useLoad } from '@/components/app/ui'
import { api } from '@/lib/api'

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const { institutionId } = useParams<{ institutionId: string }>()
  const { data, error, reload } = useLoad(() => api.institution(institutionId), [institutionId])

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={reload} />
        <Link href="/dashboard" className={buttonStyles.secondary}>Back to your institutions</Link>
      </div>
    )
  }
  if (!data) return <Loading rows={4} />
  return <InstitutionProvider institution={data} reload={reload}>{children}</InstitutionProvider>
}
