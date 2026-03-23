import { requireAdmin } from '../../lib/auth'
import { readNavigationData } from '../../lib/navigation-store'
import AdminClient from './admin-client'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const admin = await requireAdmin()
  const data = readNavigationData()

  return <AdminClient initialData={data} adminUsername={admin.username} />
}
