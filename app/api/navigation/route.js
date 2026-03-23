import { NextResponse } from 'next/server'
import { readNavigationData, writeNavigationData } from '../../../lib/navigation-store'
import { invalidOriginResponse, isSameOriginRequest, requireAdminFromRequest, unauthorizedResponse } from '../../../lib/request-auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const admin = requireAdminFromRequest(request)

  if (!admin) {
    return unauthorizedResponse()
  }

  return NextResponse.json(readNavigationData())
}

export async function PUT(request) {
  if (!isSameOriginRequest(request)) {
    return invalidOriginResponse()
  }

  const admin = requireAdminFromRequest(request)

  if (!admin) {
    return unauthorizedResponse()
  }

  const payload = await request.json()
  const data = writeNavigationData(payload)
  return NextResponse.json(data)
}
