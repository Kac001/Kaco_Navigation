import Link from 'next/link'
import { readNavigationData } from '../lib/navigation-store'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  const data = readNavigationData()

  return {
    title: data.profile.siteTitle || '我的常用网址导航',
  }
}

export default function HomePage() {
  const data = readNavigationData()

  return (
    <main className="site-shell">
      <section className="nav-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Navigation</p>
            <h1>{data.profile.siteTitle}</h1>
          </div>
          <div className="panel-actions">
            <Link className="admin-entry" href="/admin">
              进入后台管理
            </Link>
          </div>
        </div>

        {data.groups.map((group, index) => (
          <section className="category-section" key={group.id}>
            <div className="category-headline">
              <h2 className={index === 0 ? 'category-title category-title--active' : 'category-title'}>
                {group.title}
              </h2>
              <p>{group.description}</p>
            </div>

            <div className={`links-box links-box--${group.tone} ${index === 0 ? 'links-box--active' : ''}`}>
              {group.links.map((link) => (
                <a className="nav-link-card" key={link.id} href={link.url} target="_blank" rel="noreferrer">
                  <strong>{link.name}</strong>
                  <span>{link.meta}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </section>

      <aside className="profile-panel">
        <div className="profile-top">
          <div className="avatar">{data.profile.name.slice(0, 1) || 'K'}</div>
          <div className="profile-copy">
            <h2>{data.profile.name}</h2>
            <p>{data.profile.role}</p>
          </div>
        </div>

        <div className="profile-card">
          <p className="profile-label">{data.profile.statusTitle}</p>
          <strong>{data.profile.statusHighlight}</strong>
          <span>{data.profile.statusText}</span>
        </div>

        <div className="profile-card profile-card--soft">
          <p className="profile-label">{data.profile.tipsTitle}</p>
          <ul>
            {data.profile.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}