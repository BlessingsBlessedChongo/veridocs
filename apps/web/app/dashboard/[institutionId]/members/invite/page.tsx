import { redirect } from 'next/navigation'
export default async function P({ params }: { params: Promise<{ institutionId: string }> }) { redirect(`/dashboard/${(await params).institutionId}/members`) }
