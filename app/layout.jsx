import './globals.css'

export const metadata = {
  title: '网址导航管理系统',
  description: '基于 Next.js 的网址导航系统与后台管理界面',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}