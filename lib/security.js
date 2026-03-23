import crypto from 'crypto'

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':')

  if (!salt || !originalHash) {
    return false
  }

  const passwordHash = crypto.scryptSync(password, salt, 64)
  const originalBuffer = Buffer.from(originalHash, 'hex')

  if (passwordHash.length !== originalBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(passwordHash, originalBuffer)
}
