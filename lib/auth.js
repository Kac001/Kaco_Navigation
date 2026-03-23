import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from './db'
import { hashPassword, verifyPassword } from './security'

export const sessionCookieName = 'nav_admin_session'
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7

export function authenticateAdmin(username, password) {
  const admin = db.prepare('SELECT id, username, password_hash FROM admins WHERE username = ?').get(username)

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return null
  }

  return { id: admin.id, username: admin.username }
}

export function changeAdminPassword(adminId, currentPassword, nextPassword) {
  const admin = db.prepare('SELECT id, password_hash FROM admins WHERE id = ?').get(adminId)

  if (!admin || !verifyPassword(currentPassword, admin.password_hash)) {
    return { ok: false, error: '当前密码不正确。' }
  }

  if (typeof nextPassword !== 'string' || nextPassword.length < 8) {
    return { ok: false, error: '新密码至少需要 8 位。' }
  }

  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(nextPassword), adminId)

  return { ok: true }
}

export function createAdminSession(adminId) {
  const token = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + sessionDurationMs

  db.prepare('INSERT INTO admin_sessions (admin_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    adminId,
    token,
    expiresAt,
    now,
  )

  return { token, expiresAt }
}

export function deleteAdminSession(token) {
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token)
}

export function getAdminBySessionToken(token) {
  if (!token) {
    return null
  }

  const session = db
    .prepare(
      `SELECT admin_sessions.token, admin_sessions.expires_at, admins.id, admins.username
       FROM admin_sessions
       INNER JOIN admins ON admins.id = admin_sessions.admin_id
       WHERE admin_sessions.token = ?`,
    )
    .get(token)

  if (!session) {
    return null
  }

  if (session.expires_at <= Date.now()) {
    deleteAdminSession(token)
    return null
  }

  return {
    id: session.id,
    username: session.username,
    token: session.token,
    expiresAt: session.expires_at,
  }
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value
  return getAdminBySessionToken(token)
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  return admin
}

export function buildSessionCookie(session) {
  return {
    name: sessionCookieName,
    value: session.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(session.expiresAt),
    path: '/',
  }
}

export function buildExpiredSessionCookie() {
  return {
    name: sessionCookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  }
}