export default function manifest() {
  return {
    name: '网址导航管理系统',
    short_name: '网址导航',
    description: '基于 Next.js 的网址导航系统与后台管理界面',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5efe4',
    theme_color: '#c68b3c',
    lang: 'zh-CN',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  }
}
