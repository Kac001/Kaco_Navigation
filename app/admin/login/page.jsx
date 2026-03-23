import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '../../../lib/auth'
import LoginForm from './login-form'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin()

  if (admin) {
    redirect('/admin')
  }

  return <LoginForm />
}
