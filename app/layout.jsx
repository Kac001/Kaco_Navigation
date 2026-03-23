import './globals.css'
import PwaRegister from './pwa-register'

export const metadata = {
  title: '网址导航管理系统',
  description: '基于 Next.js 的网址导航系统与后台管理界面',
  manifest: '/manifest.webmanifest',
  applicationName: '网址导航管理系统',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '网址导航管理系统',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
