'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SecurityClient({ adminUsername }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    currentPassword: '',
    nextPassword: '',
    confirmPassword: '',
  })
  const [saveState, setSaveState] = useState('idle')
  const [message, setMessage] = useState('')

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveState('saving')
    setMessage('')

    const response = await fetch('/api/auth/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })

    const payload = await response.json().catch(() => ({ error: '修改密码失败，请稍后重试。' }))

    if (response.status === 401) {
      setSaveState('error')
      setMessage('登录已失效，请重新登录。')
      router.push('/admin/login')
      return
    }

    if (!response.ok) {
      setSaveState('error')
      setMessage(payload.error || '修改密码失败，请稍后重试。')
      return
    }

    setFormData({
      currentPassword: '',
      nextPassword: '',
      confirmPassword: '',
    })
    setSaveState('success')
    setMessage(payload.message || '密码修改成功。')
  }

  return (
    <main className="admin-shell">
      <section className="admin-header-card">
        <div>
          <p className="panel-kicker">Security</p>
          <h1>修改密码</h1>
          <p className="admin-summary">当前登录账号：{adminUsername}。你可以在这里修改管理员密码。</p>
        </div>
        <div className="admin-header-actions">
          <Link className="ghost-button" href="/admin">
            返回后台首页
          </Link>
        </div>
      </section>

      <form className="admin-section password-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            <span>当前密码</span>
            <input type="password" value={formData.currentPassword} onChange={(event) => updateField('currentPassword', event.target.value)} />
          </label>
          <label>
            <span>新密码</span>
            <input type="password" value={formData.nextPassword} onChange={(event) => updateField('nextPassword', event.target.value)} />
          </label>
          <label>
            <span>确认新密码</span>
            <input type="password" value={formData.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />
          </label>
        </div>

        <div className="password-actions">
          <p className={`save-message save-message--${saveState}`}>{message}</p>
          <button className="primary-button" type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? '修改中...' : '修改密码'}
          </button>
        </div>
      </form>
    </main>
  )
}