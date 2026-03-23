import { NextResponse } from 'next/server'
import { getAdminBySessionToken } from './auth'

export function unauthorizedResponse() {
  return NextResponse.json({ error: '未登录或登录已失效。' }, { status: 401 })
}

export function requireAdminFromRequest(request) {
  const token = request.cookies.get('nav_admin_session')?.value
  return getAdminBySessionToken(token)
}

function getExpectedOrigin(request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '')

  if (!host || !protocol) {
    return null
  }

  return `${protocol}://${host}`
}

export function invalidOriginResponse() {
  return NextResponse.json({ error: '非法请求来源。' }, { status: 403 })
}

export function isSameOriginRequest(request) {
  const expectedOrigin = getExpectedOrigin(request)

  if (!expectedOrigin) {
    return false
  }

  const origin = request.headers.get('origin')

  if (origin) {
    try {
      return new URL(origin).origin === expectedOrigin
    } catch {
      return false
    }
  }

  const referer = request.headers.get('referer')

  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin
    } catch {
      return false
    }
  }

  return false
}
