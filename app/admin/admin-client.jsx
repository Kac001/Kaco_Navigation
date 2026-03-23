'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const tones = [
  { value: 'amber', label: '暖黄' },
  { value: 'blue', label: '浅蓝' },
  { value: 'green', label: '浅绿' },
]

function createGroup() {
  return {
    id: crypto.randomUUID(),
    title: '新分类',
    tone: 'amber',
    description: '请填写分类说明',
    links: [],
  }
}

function createLink(groupId) {
  return {
    id: `${groupId}-${crypto.randomUUID()}`,
    name: '新网站',
    url: 'https://example.com/',
    meta: '站点说明',
  }
}

function reorderItems(items, fromId, toId) {
  if (fromId === toId) {
    return items
  }

  const nextItems = [...items]
  const fromIndex = nextItems.findIndex((item) => item.id === fromId)
  const toIndex = nextItems.findIndex((item) => item.id === toId)

  if (fromIndex === -1 || toIndex === -1) {
    return items
  }

  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

function moveLinkBetweenGroups(groups, dragState, targetGroupId, targetLinkId = null) {
  if (!dragState) {
    return groups
  }

  const sourceGroupIndex = groups.findIndex((group) => group.id === dragState.groupId)
  const targetGroupIndex = groups.findIndex((group) => group.id === targetGroupId)

  if (sourceGroupIndex === -1 || targetGroupIndex === -1) {
    return groups
  }

  const nextGroups = groups.map((group) => ({ ...group, links: [...group.links] }))
  const sourceGroup = nextGroups[sourceGroupIndex]
  const targetGroup = nextGroups[targetGroupIndex]
  const linkIndex = sourceGroup.links.findIndex((link) => link.id === dragState.linkId)

  if (linkIndex === -1) {
    return groups
  }

  const [movedLink] = sourceGroup.links.splice(linkIndex, 1)

  if (!targetLinkId) {
    targetGroup.links.push(movedLink)
    return nextGroups
  }

  const targetIndex = targetGroup.links.findIndex((link) => link.id === targetLinkId)

  if (targetIndex === -1) {
    targetGroup.links.push(movedLink)
    return nextGroups
  }

  targetGroup.links.splice(targetIndex, 0, movedLink)
  return nextGroups
}

export default function AdminClient({ initialData }) {
  const router = useRouter()
  const [formData, setFormData] = useState(initialData)
  const [saveState, setSaveState] = useState('idle')
  const [message, setMessage] = useState('')
  const [dragGroupId, setDragGroupId] = useState(null)
  const [dragLinkState, setDragLinkState] = useState(null)
  const pendingFocusGroupIdRef = useRef(null)
  const groupRefs = useRef(new Map())

  useEffect(() => {
    if (!pendingFocusGroupIdRef.current) {
      return
    }

    const element = groupRefs.current.get(pendingFocusGroupIdRef.current)

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = element.querySelector('input')
      input?.focus()
    }

    pendingFocusGroupIdRef.current = null
  }, [formData.groups])

  function updateProfile(field, value) {
    setFormData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }))
  }

  function updateTip(index, value) {
    setFormData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tips: current.profile.tips.map((tip, tipIndex) => (tipIndex === index ? value : tip)),
      },
    }))
  }

  function addTip() {
    setFormData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tips: [...current.profile.tips, '新的提示信息'],
      },
    }))
  }

  function removeTip(index) {
    setFormData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tips: current.profile.tips.filter((_, tipIndex) => tipIndex !== index),
      },
    }))
  }

  function updateGroup(groupId, field, value) {
    setFormData((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, [field]: value } : group)),
    }))
  }

  function addGroup() {
    const nextGroup = createGroup()
    setFormData((current) => ({
      ...current,
      groups: [...current.groups, nextGroup],
    }))
    pendingFocusGroupIdRef.current = nextGroup.id
  }

  function removeGroup(groupId) {
    setFormData((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
    }))
  }

  function updateLink(groupId, linkId, field, value) {
    setFormData((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              links: group.links.map((link) => (link.id === linkId ? { ...link, [field]: value } : link)),
            }
          : group,
      ),
    }))
  }

  function addLink(groupId) {
    setFormData((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, links: [...group.links, createLink(groupId)] } : group,
      ),
    }))
  }

  function removeLink(groupId, linkId) {
    setFormData((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, links: group.links.filter((link) => link.id !== linkId) } : group,
      ),
    }))
  }

  function handleGroupDrop(targetGroupId) {
    if (!dragGroupId) {
      return
    }

    setFormData((current) => ({
      ...current,
      groups: reorderItems(current.groups, dragGroupId, targetGroupId),
    }))
    setDragGroupId(null)
  }

  function handleLinkDrop(targetGroupId, targetLinkId = null) {
    if (!dragLinkState) {
      return
    }

    setFormData((current) => ({
      ...current,
      groups: moveLinkBetweenGroups(current.groups, dragLinkState, targetGroupId, targetLinkId),
    }))
    setDragLinkState(null)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveState('saving')
    setMessage('')

    const response = await fetch('/api/navigation', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })

    if (response.status === 401) {
      setSaveState('error')
      setMessage('登录已失效，请重新登录。')
      router.push('/admin/login')
      return
    }

    if (!response.ok) {
      setSaveState('error')
      setMessage('保存失败，请稍后重试。')
      return
    }

    const nextData = await response.json()
    setFormData(nextData)
    setSaveState('success')
    setMessage('保存成功，前台导航页已更新。')
    router.refresh()
  }

  return (
    <main className="admin-shell">
      <section className="admin-header-card">
        <div>
          <p className="panel-kicker">Admin Console</p>
          <h1>导航后台管理</h1>
        </div>
        <div className="admin-header-actions">
          <Link className="ghost-button" href="/">
            查看前台
          </Link>
          <Link className="ghost-button" href="/admin/security">
            修改密码
          </Link>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            退出登录
          </button>
          <button className="primary-button" type="submit" form="navigation-admin-form" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? '保存中...' : '保存全部'}
          </button>
        </div>
      </section>

      <form className="admin-grid" id="navigation-admin-form" onSubmit={handleSubmit}>
        <section className="admin-section">
          <div className="admin-section-header">
            <h2>站点信息</h2>
          </div>

          <div className="field-grid">
            <label>
              <span>前端标题</span>
              <input value={formData.profile.siteTitle || ''} onChange={(event) => updateProfile('siteTitle', event.target.value)} />
            </label>
            <label>
              <span>名称</span>
              <input value={formData.profile.name} onChange={(event) => updateProfile('name', event.target.value)} />
            </label>
            <label>
              <span>角色</span>
              <input value={formData.profile.role} onChange={(event) => updateProfile('role', event.target.value)} />
            </label>
            <label>
              <span>状态标题</span>
              <input value={formData.profile.statusTitle} onChange={(event) => updateProfile('statusTitle', event.target.value)} />
            </label>
            <label>
              <span>状态高亮</span>
              <input value={formData.profile.statusHighlight} onChange={(event) => updateProfile('statusHighlight', event.target.value)} />
            </label>
            <label className="field-wide">
              <span>状态描述</span>
              <textarea rows="3" value={formData.profile.statusText} onChange={(event) => updateProfile('statusText', event.target.value)} />
            </label>
            <label>
              <span>提示标题</span>
              <input value={formData.profile.tipsTitle} onChange={(event) => updateProfile('tipsTitle', event.target.value)} />
            </label>
          </div>

          <div className="tips-editor">
            <div className="inline-header">
              <h3>提示信息</h3>
              <button className="ghost-button" type="button" onClick={addTip}>
                添加提示
              </button>
            </div>

            {formData.profile.tips.map((tip, index) => (
              <div className="tip-row" key={`${tip}-${index}`}>
                <input value={tip} onChange={(event) => updateTip(index, event.target.value)} />
                <button className="danger-button" type="button" onClick={() => removeTip(index)}>
                  删除
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-header">
            <h2>导航分类</h2>
            <button className="ghost-button" type="button" onClick={addGroup}>
              添加分类
            </button>
          </div>

          <div className="sort-hint">
            点击“添加分类”后，页面会自动滚动到新卡片。你也可以拖拽分类卡片调整顺序，拖拽网址卡片调整位置或移动到其他分类。
          </div>

          <div className="group-stack">
            {formData.groups.map((group) => (
              <article
                className="group-editor"
                draggable
                key={group.id}
                ref={(element) => {
                  if (element) {
                    groupRefs.current.set(group.id, element)
                  } else {
                    groupRefs.current.delete(group.id)
                  }
                }}
                onDragStart={() => setDragGroupId(group.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleGroupDrop(group.id)}
              >
                <div className="group-editor-top">
                  <h3>{group.title}</h3>
                  <button className="danger-button" type="button" onClick={() => removeGroup(group.id)}>
                    删除分类
                  </button>
                </div>

                <div className="field-grid">
                  <label>
                    <span>分类名称</span>
                    <input value={group.title} onChange={(event) => updateGroup(group.id, 'title', event.target.value)} />
                  </label>
                  <label>
                    <span>配色</span>
                    <select value={group.tone} onChange={(event) => updateGroup(group.id, 'tone', event.target.value)}>
                      {tones.map((tone) => (
                        <option key={tone.value} value={tone.value}>
                          {tone.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-wide">
                    <span>分类说明</span>
                    <textarea rows="2" value={group.description} onChange={(event) => updateGroup(group.id, 'description', event.target.value)} />
                  </label>
                </div>

                <div className="inline-header">
                  <h4>网址列表</h4>
                  <button className="ghost-button" type="button" onClick={() => addLink(group.id)}>
                    添加网址
                  </button>
                </div>

                <div className="link-editor-stack" onDragOver={(event) => event.preventDefault()} onDrop={() => handleLinkDrop(group.id)}>
                  {group.links.map((link) => (
                    <div
                      className="link-editor"
                      draggable
                      key={link.id}
                      onDragStart={() => setDragLinkState({ groupId: group.id, linkId: link.id })}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleLinkDrop(group.id, link.id)}
                    >
                      <label>
                        <span>名称</span>
                        <input value={link.name} onChange={(event) => updateLink(group.id, link.id, 'name', event.target.value)} />
                      </label>
                      <label>
                        <span>链接</span>
                        <input value={link.url} onChange={(event) => updateLink(group.id, link.id, 'url', event.target.value)} />
                      </label>
                      <label>
                        <span>说明</span>
                        <input value={link.meta} onChange={(event) => updateLink(group.id, link.id, 'meta', event.target.value)} />
                      </label>
                      <button className="danger-button" type="button" onClick={() => removeLink(group.id, link.id)}>
                        删除
                      </button>
                    </div>
                  ))}
                  <div className="drop-zone">拖到这里可追加到 {group.title} 的末尾</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </form>

      <p className={`save-message save-message--${saveState}`}>{message}</p>
    </main>
  )
}