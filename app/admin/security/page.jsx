import { requireAdmin } from '../../../lib/auth'
import SecurityClient from './security-client'

export const dynamic = 'force-dynamic'

export default async function AdminSecurityPage() {
  const admin = await requireAdmin()

  return <SecurityClient adminUsername={admin.username} />
}