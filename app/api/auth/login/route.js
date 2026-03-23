import { NextResponse } from 'next/server'
import {
  authenticateAdmin,
  buildSessionCookie,
  clearFailedLoginAttempts,
  createAdminSession,
  getLoginRateLimitState,
  hasConfiguredAdmin,
  recordFailedLogin,
} from '../../../../lib/auth'
import { invalidOriginResponse, isSameOriginRequest } from '../../../../lib/request-auth'

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown-ip'
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return invalidOriginResponse()
  }

  const body = await request.json()
  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  const clientIp = getClientIp(request)

  if (!hasConfiguredAdmin()) {
    return NextResponse.json({ error: '管理员账号尚未初始化，请先配置 ADMIN_INITIAL_PASSWORD 后重启服务。' }, { status: 503 })
  }

  const rateLimit = getLoginRateLimitState(username, clientIp)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: '登录尝试过于频繁，请稍后再试。' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    )
  }

  const admin = authenticateAdmin(username, password)

  if (!admin) {
    recordFailedLogin(username, clientIp)
    return NextResponse.json({ error: '账号或密码错误。' }, { status: 401 })
  }

  clearFailedLoginAttempts(username, clientIp)
  const session = createAdminSession(admin.id)
  const response = NextResponse.json({ ok: true, username: admin.username })
  response.cookies.set(buildSessionCookie(session))
  return response
}
