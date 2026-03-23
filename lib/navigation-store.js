import { db } from './db'

const allowedTones = new Set(['amber', 'blue', 'green'])
const fallbackUrl = 'https://example.com/'

function normalizeSafeUrl(value) {
  const raw = String(value || fallbackUrl).trim()

  try {
    const url = new URL(raw)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    return fallbackUrl
  }

  return fallbackUrl
}

function normalizeNavigationData(payload) {
  return {
    profile: {
      siteTitle: payload?.profile?.siteTitle?.trim() || '我的常用网址导航',
      name: payload?.profile?.name?.trim() || 'Kaco',
      role: payload?.profile?.role?.trim() || '前端导航页',
      statusTitle: payload?.profile?.statusTitle?.trim() || '今日状态',
      statusHighlight: payload?.profile?.statusHighlight?.trim() || '灵感在线',
      statusText: payload?.profile?.statusText?.trim() || '收集常用工具和参考站点，让每次打开浏览器都有明确起点。',
      tipsTitle: payload?.profile?.tipsTitle?.trim() || '快捷提示',
      tips: Array.isArray(payload?.profile?.tips)
        ? payload.profile.tips.map((tip) => String(tip).trim()).filter(Boolean)
        : [],
    },
    groups: Array.isArray(payload?.groups)
      ? payload.groups.map((group, groupIndex) => ({
          id: group?.id || `group-${groupIndex + 1}`,
          title: String(group?.title || `分类${groupIndex + 1}`).trim(),
          tone: allowedTones.has(group?.tone) ? group.tone : 'amber',
          description: String(group?.description || '').trim(),
          links: Array.isArray(group?.links)
            ? group.links.map((link, linkIndex) => ({
                id: link?.id || `${group?.id || `group-${groupIndex + 1}`}-link-${linkIndex + 1}`,
                name: String(link?.name || `网站${linkIndex + 1}`).trim(),
                url: normalizeSafeUrl(link?.url),
                meta: String(link?.meta || '站点说明').trim(),
              }))
            : [],
        }))
      : [],
  }
}

export function readNavigationData() {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
  const tips = db.prepare('SELECT content FROM tips ORDER BY sort_order ASC, id ASC').all()
  const groups = db.prepare('SELECT * FROM groups ORDER BY sort_order ASC, id ASC').all()
  const links = db.prepare('SELECT * FROM links ORDER BY sort_order ASC, id ASC').all()

  return {
    profile: {
      siteTitle: profile?.site_title || '我的常用网址导航',
      name: profile?.name || 'Kaco',
      role: profile?.role || '前端导航页',
      statusTitle: profile?.status_title || '今日状态',
      statusHighlight: profile?.status_highlight || '灵感在线',
      statusText: profile?.status_text || '收集常用工具和参考站点，让每次打开浏览器都有明确起点。',
      tipsTitle: profile?.tips_title || '快捷提示',
      tips: tips.map((tip) => tip.content),
    },
    groups: groups.map((group) => ({
      id: group.id,
      title: group.title,
      tone: group.tone,
      description: group.description,
      links: links
        .filter((link) => link.group_id === group.id)
        .map((link) => ({
          id: link.id,
          name: link.name,
          url: link.url,
          meta: link.meta,
        })),
    })),
  }
}

export function writeNavigationData(payload) {
  const normalized = normalizeNavigationData(payload)

  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE profile
       SET site_title = @siteTitle,
           name = @name,
           role = @role,
           status_title = @statusTitle,
           status_highlight = @statusHighlight,
           status_text = @statusText,
           tips_title = @tipsTitle
       WHERE id = 1`,
    ).run(normalized.profile)

    db.prepare('DELETE FROM tips').run()
    normalized.profile.tips.forEach((tip, index) => {
      db.prepare('INSERT INTO tips (content, sort_order) VALUES (?, ?)').run(tip, index)
    })

    db.prepare('DELETE FROM links').run()
    db.prepare('DELETE FROM groups').run()

    normalized.groups.forEach((group, groupIndex) => {
      db.prepare('INSERT INTO groups (id, title, tone, description, sort_order) VALUES (?, ?, ?, ?, ?)').run(
        group.id,
        group.title,
        group.tone,
        group.description,
        groupIndex,
      )

      group.links.forEach((link, linkIndex) => {
        db.prepare('INSERT INTO links (id, group_id, name, url, meta, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(
          link.id,
          group.id,
          link.name,
          link.url,
          link.meta,
          linkIndex,
        )
      })
    })
  })

  transaction()
  return readNavigationData()
}
