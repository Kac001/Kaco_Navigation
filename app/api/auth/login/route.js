import { NextResponse } from 'next/server'
import { authenticateAdmin, buildSessionCookie, createAdminSession } from '../../../../lib/auth'

export async function POST(request) {
  const body = await request.json()
  const admin = authenticateAdmin(body.username, body.password)

  if (!admin) {
    return NextResponse.json({ error: '账号或密码错误。' }, { status: 401 })
  }

  const session = createAdminSession(admin.id)
  const response = NextResponse.json({ ok: true, username: admin.username })
  response.cookies.set(buildSessionCookie(session))
  return response
}
