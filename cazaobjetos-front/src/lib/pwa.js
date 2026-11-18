import { useEffect, useRef, useState } from 'react'

let installationObserved = false

/** Botón «Instalar app»: Chrome, Edge y Android disparan beforeinstallprompt. */
export function useInstall() {
  const [evento, setEvento] = useState(null)
  const prompting = useRef(false)
  const [instalando, setInstalando] = useState(false)
  const [instalada, setInstalada] = useState(
    installationObserved || window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
  const [mostrarAyuda, setMostrarAyuda] = useState(false)

  useEffect(() => {
    const antes = (e) => { e.preventDefault(); setEvento(e) }
    const despues = () => { installationObserved = true; setEvento(null); setInstalada(true); setMostrarAyuda(false) }
    const media = matchMedia('(display-mode: standalone)')
    const mode = () => setInstalada(installationObserved || media.matches || navigator.standalone === true)
    media.addEventListener('change', mode)
    window.addEventListener('beforeinstallprompt', antes)
    window.addEventListener('appinstalled', despues)
    return () => {
      media.removeEventListener('change', mode)
      window.removeEventListener('beforeinstallprompt', antes)
      window.removeEventListener('appinstalled', despues)
    }
  }, [])

  async function instalar() {
    if (prompting.current) return
    if (!evento) {
      setMostrarAyuda(true)
      return
    }

    prompting.current = true; setInstalando(true)
    try {
      await evento.prompt()
      await evento.userChoice
      setEvento(null)
    } catch {
      setEvento(null); setMostrarAyuda(true)
    } finally { prompting.current = false; setInstalando(false) }
  }
  return {
    instalada,
    instalando,
    mostrarAyuda,
    cerrarAyuda: () => setMostrarAyuda(false),
    instalar,
  }
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}
