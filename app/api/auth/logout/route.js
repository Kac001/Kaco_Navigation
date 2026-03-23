import { NextResponse } from 'next/server'
import { buildExpiredSessionCookie, deleteAdminSession } from '../../../../lib/auth'

export async function POST(request) {
  const token = request.cookies.get('nav_admin_session')?.value

  if (token) {
    deleteAdminSession(token)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(buildExpiredSessionCookie())
  return response
}
