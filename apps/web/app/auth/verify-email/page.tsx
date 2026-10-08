import Link from 'next/link'
import { CenterCard } from '@/components/shared/shell'
import { Logo } from '@/components/ui/logo'
export default function P() { return <CenterCard><div className="text-center"><Logo size={48} variant="primary" className="mx-auto mb-6" aria-hidden /><h1 className="text-2xl font-semibold">Check your email.</h1><p className="mt-2 text-slate-600">We sent a verification link. Click it to activate your account.</p><Link className="mt-6 inline-block text-indigo-600" href="/auth/login">Back to sign in</Link></div></CenterCard> }
