import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from './db'
import { hashPassword, hashSessionToken, verifyPassword } from './security'

export const sessionCookieName = 'nav_admin_session'
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7
const loginWindowMs = 1000 * 60 * 15
const loginBlockMs = 1000 * 60 * 15
const maxLoginAttempts = 5

function normalizeLoginKeyPart(value, fallback) {
  return String(value || fallback)
    .trim()
    .toLowerCase()
}

function buildLoginRateLimitKey(username, clientIp) {
  return `${normalizeLoginKeyPart(username, 'unknown-user')}|${normalizeLoginKeyPart(clientIp, 'unknown-ip')}`
}

function readLoginRateLimit(key) {
  return db.prepare('SELECT attempts, window_start, blocked_until FROM login_rate_limits WHERE key = ?').get(key)
}

function clearLoginRateLimit(key) {
  db.prepare('DELETE FROM login_rate_limits WHERE key = ?').run(key)
}

function getAdminSessionColumns() {
  const columns = db.prepare('PRAGMA table_info(admin_sessions)').all()
  return new Set(columns.map((column) => column.name))
}

function usesHashedSessionTokens() {
  return getAdminSessionColumns().has('token_hash')
}

export function hasConfiguredAdmin() {
  return db.prepare('SELECT 1 FROM admins LIMIT 1').get() !== undefined
}

export function getLoginRateLimitState(username, clientIp) {
  const key = buildLoginRateLimitKey(username, clientIp)
  const record = readLoginRateLimit(key)
  const now = Date.now()

  if (!record) {
    return { allowed: true, retryAfterMs: 0 }
  }

  if (record.blocked_until && record.blocked_until > now) {
    return { allowed: false, retryAfterMs: record.blocked_until - now }
  }

  if (now - record.window_start > loginWindowMs) {
    clearLoginRateLimit(key)
  }

  return { allowed: true, retryAfterMs: 0 }
}

export function recordFailedLogin(username, clientIp) {
  const key = buildLoginRateLimitKey(username, clientIp)
  const now = Date.now()
  const record = readLoginRateLimit(key)

  if (!record || now - record.window_start > loginWindowMs) {
    db.prepare('INSERT OR REPLACE INTO login_rate_limits (key, attempts, window_start, blocked_until) VALUES (?, ?, ?, ?)').run(
      key,
      1,
      now,
      null,
    )
    return
  }

  const attempts = record.attempts + 1
  const blockedUntil = attempts >= maxLoginAttempts ? now + loginBlockMs : null

  db.prepare('UPDATE login_rate_limits SET attempts = ?, blocked_until = ? WHERE key = ?').run(attempts, blockedUntil, key)
}

export function clearFailedLoginAttempts(username, clientIp) {
  clearLoginRateLimit(buildLoginRateLimitKey(username, clientIp))
}

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
  db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').run(adminId)

  return { ok: true }
}

export function createAdminSession(adminId) {
  const token = crypto.randomUUID()
  const tokenHash = hashSessionToken(token)
  const now = Date.now()
  const expiresAt = now + sessionDurationMs

  if (usesHashedSessionTokens()) {
    db.prepare('INSERT INTO admin_sessions (admin_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      adminId,
      tokenHash,
      expiresAt,
      now,
    )
  } else {
    db.prepare('INSERT INTO admin_sessions (admin_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      adminId,
      token,
      expiresAt,
      now,
    )
  }

  return { token, expiresAt }
}

export function deleteAdminSession(token) {
  if (usesHashedSessionTokens()) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashSessionToken(token))
  } else {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token)
  }
}

export function getAdminBySessionToken(token) {
  if (!token) {
    return null
  }

  const tokenHash = hashSessionToken(token)
  const session = usesHashedSessionTokens()
    ? db
        .prepare(
          `SELECT admin_sessions.expires_at, admins.id, admins.username
           FROM admin_sessions
           INNER JOIN admins ON admins.id = admin_sessions.admin_id
           WHERE admin_sessions.token_hash = ?`,
        )
        .get(tokenHash)
    : db
        .prepare(
          `SELECT admin_sessions.expires_at, admins.id, admins.username
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
    token,
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
