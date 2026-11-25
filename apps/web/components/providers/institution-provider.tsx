'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import type { InstitutionDetail, InstitutionRole } from '@/lib/types'

interface InstitutionValue {
  institution: InstitutionDetail
  reload: () => Promise<void>
  /** True when the signed-in person's role is one of these. */
  can: (...roles: InstitutionRole[]) => boolean
}

const InstitutionContext = React.createContext<InstitutionValue | null>(null)

export function InstitutionProvider({ institution, reload, children }: { institution: InstitutionDetail; reload: () => Promise<void>; children: React.ReactNode }) {
  const value = React.useMemo<InstitutionValue>(
    () => ({ institution, reload, can: (...roles) => roles.includes(institution.role) }),
    [institution, reload],
  )
  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>
}

/** The institution the current dashboard page belongs to, and the viewer's role in it. */
export function useInstitution(): InstitutionValue {
  const value = React.useContext(InstitutionContext)
  if (!value) throw new Error('useInstitution must be used inside an institution page')
  return value
}

export { api }
