import { createBrowserClient as create } from '@supabase/ssr'
export const createBrowserClient = () =>
  create(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key')
