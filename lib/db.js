import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { hashPassword, hashSessionToken } from './security'

const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'navigation.db')
const seedPath = path.join(dataDir, 'navigation.json')

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

function normalizeSeed(seed) {
  return {
    profile: {
      siteTitle: seed?.profile?.siteTitle || '我的常用网址导航',
      name: seed?.profile?.name || 'Kaco',
      role: seed?.profile?.role || '前端导航页',
      statusTitle: seed?.profile?.statusTitle || '今日状态',
      statusHighlight: seed?.profile?.statusHighlight || '灵感在线',
      statusText: seed?.profile?.statusText || '收集常用工具和参考站点，让每次打开浏览器都有明确起点。',
      tipsTitle: seed?.profile?.tipsTitle || '快捷提示',
      tips:
        Array.isArray(seed?.profile?.tips) && seed.profile.tips.length > 0
          ? seed.profile.tips.filter(Boolean)
          : ['点击卡片可直接跳转', '手机端自动改为上下布局', '后续可继续替换成真实站点'],
    },
    groups: Array.isArray(seed?.groups)
      ? seed.groups.map((group, groupIndex) => ({
          id: group.id || `group-${groupIndex + 1}`,
          title: group.title || `分类${groupIndex + 1}`,
          tone: ['amber', 'blue', 'green'].includes(group.tone) ? group.tone : 'amber',
          description: group.description || '',
          links: Array.isArray(group.links)
            ? group.links.map((link, linkIndex) => ({
                id: link.id || `group-${groupIndex + 1}-link-${linkIndex + 1}`,
                name: link.name || `网站${linkIndex + 1}`,
                url: link.url || 'https://example.com/',
                meta: link.meta || '站点说明',
              }))
            : [],
        }))
      : [],
  }
}

function readSeedData() {
  if (!fs.existsSync(seedPath)) {
    return normalizeSeed(null)
  }

  try {
    const raw = fs.readFileSync(seedPath, 'utf8')
    return normalizeSeed(JSON.parse(raw))
  } catch {
    return normalizeSeed(null)
  }
}

function ensureProfileColumns() {
  const columns = db.prepare('PRAGMA table_info(profile)').all()
  const columnNames = new Set(columns.map((column) => column.name))

  if (!columnNames.has('site_title')) {
    try {
      db.exec("ALTER TABLE profile ADD COLUMN site_title TEXT NOT NULL DEFAULT '我的常用网址导航'")
    } catch (error) {
      // `next build` may initialize the database in parallel across processes.
      // If another process adds the column first, treat the duplicate-column
      // error as a successful migration instead of failing the build.
      if (!(error?.code === 'SQLITE_ERROR' && error?.message?.includes('duplicate column name: site_title'))) {
        throw error
      }
    }
  }
}

function ensureAdminSessionSchema() {
  const columns = db.prepare('PRAGMA table_info(admin_sessions)').all()
  const columnNames = new Set(columns.map((column) => column.name))

  if (columnNames.has('token_hash')) {
    return
  }

  db.exec(`
    ALTER TABLE admin_sessions RENAME TO admin_sessions_legacy;

    CREATE TABLE admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
    );
  `)

  const legacySessions = db
    .prepare('SELECT id, admin_id, token, expires_at, created_at FROM admin_sessions_legacy ORDER BY id ASC')
    .all()
  const insertSession = db.prepare(
    'INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  )

  legacySessions.forEach((session) => {
    insertSession.run(session.id, session.admin_id, hashSessionToken(session.token), session.expires_at, session.created_at)
  })

  db.exec('DROP TABLE admin_sessions_legacy')
}

function initialize() {
  db.exec('BEGIN IMMEDIATE')

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status_title TEXT NOT NULL,
        status_highlight TEXT NOT NULL,
        status_text TEXT NOT NULL,
        tips_title TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        tone TEXT NOT NULL,
        description TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        meta TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS login_rate_limits (
        key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        window_start INTEGER NOT NULL,
        blocked_until INTEGER
      );
    `)

    ensureProfileColumns()
    ensureAdminSessionSchema()

    const profileCount = db.prepare('SELECT COUNT(*) AS count FROM profile').get().count
    const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admins').get().count

    if (profileCount === 0) {
      const seed = readSeedData()
      const insertProfile = db.prepare(`
        INSERT INTO profile (id, site_title, name, role, status_title, status_highlight, status_text, tips_title)
        VALUES (1, @siteTitle, @name, @role, @statusTitle, @statusHighlight, @statusText, @tipsTitle)
      `)
      const insertTip = db.prepare('INSERT INTO tips (content, sort_order) VALUES (?, ?)')
      const insertGroup = db.prepare(
        'INSERT INTO groups (id, title, tone, description, sort_order) VALUES (@id, @title, @tone, @description, @sortOrder)',
      )
      const insertLink = db.prepare(
        'INSERT INTO links (id, group_id, name, url, meta, sort_order) VALUES (@id, @groupId, @name, @url, @meta, @sortOrder)',
      )

      insertProfile.run(seed.profile)
      seed.profile.tips.forEach((tip, index) => {
        insertTip.run(tip, index)
      })

      seed.groups.forEach((group, groupIndex) => {
        insertGroup.run({
          id: group.id,
          title: group.title,
          tone: group.tone,
          description: group.description,
          sortOrder: groupIndex,
        })

        group.links.forEach((link, linkIndex) => {
          insertLink.run({
            id: link.id,
            groupId: group.id,
            name: link.name,
            url: link.url,
            meta: link.meta,
            sortOrder: linkIndex,
          })
        })
      })
    } else {
      db.prepare("UPDATE profile SET site_title = COALESCE(NULLIF(site_title, ''), '我的常用网址导航') WHERE id = 1").run()
    }

    if (adminCount === 0) {
      const initialUsername = process.env.ADMIN_INITIAL_USERNAME?.trim() || 'admin'
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim()

      if (initialPassword) {
        if (initialPassword.length < 8) {
          throw new Error('ADMIN_INITIAL_PASSWORD must be at least 8 characters long.')
        }

        db.prepare('INSERT OR IGNORE INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)').run(
          initialUsername,
          hashPassword(initialPassword),
          Date.now(),
        )
      }
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

initialize()

export { db }
