'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: '登录失败，请稍后再试。' }))
      setSubmitting(false)
      setMessage(payload.error || '登录失败，请稍后再试。')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="panel-kicker">Admin Login</p>
        <h1>后台登录</h1>
        <p className="login-summary">登录后可管理导航分类、网址顺序，以及右侧信息栏内容。</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>账号</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? '登录中...' : '登录后台'}
          </button>
        </form>

        <p className="login-message">{message}</p>
      </section>
    </main>
  )
}
