'use client'

import { useEffect } from 'react'
import { useState } from 'react'

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState(null)
  const [installReady, setInstallReady] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setInstallEvent(event)
      setInstallReady(true)
    }

    function handleControllerChange() {
      window.location.reload()
    }

    function wireUpdateState(registration) {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setUpdateReady(true)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) {
          return
        }

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            setUpdateReady(true)
          }
        })
      })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        wireUpdateState(registration)
      })
      .catch(() => {})

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  async function handleInstall() {
    if (!installEvent) {
      return
    }

    await installEvent.prompt()
    await installEvent.userChoice.catch(() => null)
    setInstallEvent(null)
    setInstallReady(false)
  }

  function handleUpdate() {
    if (!waitingWorker) {
      return
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  return (
    <>
      {installReady ? (
        <div className="pwa-banner" role="status">
          <div>
            <strong>可安装到桌面</strong>
            <p>把导航页添加到主屏幕，打开更快，也更像原生应用。</p>
          </div>
          <button className="primary-button" onClick={handleInstall} type="button">
            立即安装
          </button>
        </div>
      ) : null}

      {updateReady ? (
        <div className="pwa-banner pwa-banner--update" role="status">
          <div>
            <strong>发现新版本</strong>
            <p>刷新后即可使用最新内容与缓存资源。</p>
          </div>
          <button className="primary-button" onClick={handleUpdate} type="button">
            立即更新
          </button>
        </div>
      ) : null}
    </>
  )
}
