import { NextResponse } from 'next/server'
import { changeAdminPassword } from '../../../../lib/auth'
import { invalidOriginResponse, isSameOriginRequest, requireAdminFromRequest, unauthorizedResponse } from '../../../../lib/request-auth'

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return invalidOriginResponse()
  }

  const admin = requireAdminFromRequest(request)

  if (!admin) {
    return unauthorizedResponse()
  }

  const body = await request.json()
  const currentPassword = String(body.currentPassword || '')
  const nextPassword = String(body.nextPassword || '')
  const confirmPassword = String(body.confirmPassword || '')

  if (!currentPassword || !nextPassword || !confirmPassword) {
    return NextResponse.json({ error: '请完整填写密码信息。' }, { status: 400 })
  }

  if (nextPassword !== confirmPassword) {
    return NextResponse.json({ error: '两次输入的新密码不一致。' }, { status: 400 })
  }

  const result = changeAdminPassword(admin.id, currentPassword, nextPassword)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, message: '密码修改成功，请重新登录。' })
}
