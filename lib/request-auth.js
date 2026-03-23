import { NextResponse } from 'next/server'
import { getAdminBySessionToken } from './auth'

export function unauthorizedResponse() {
  return NextResponse.json({ error: '未登录或登录已失效。' }, { status: 401 })
}

export function requireAdminFromRequest(request) {
  const token = request.cookies.get('nav_admin_session')?.value
  return getAdminBySessionToken(token)
}
