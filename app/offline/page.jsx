import Link from 'next/link'

export const metadata = {
  title: '离线状态',
}

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <section className="offline-card">
        <p className="panel-kicker">Offline</p>
        <h1>当前网络不可用</h1>
        <p className="offline-summary">
          你仍然可以打开已经缓存的首页内容，但后台登录、保存修改和实时接口需要联网后才能正常使用。
        </p>
        <div className="offline-actions">
          <Link className="primary-button" href="/">
            返回首页
          </Link>
          <Link className="ghost-button" href="/offline">
            重新尝试
          </Link>
        </div>
      </section>
    </main>
  )
}
