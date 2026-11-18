import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'co_theme'
const valid = (value) => ['auto', 'light', 'dark'].includes(value) ? value : 'auto'
function stored() { try { return valid(localStorage.getItem(KEY)) } catch { return 'auto' } }
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(stored)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const resolved = preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference
  const choose = useCallback((value) => {
    const next = valid(value)
    setPreference(next)
    try { localStorage.setItem(KEY, next) } catch { /* The selection still applies in this tab. */ }
  }, [])
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const change = () => setSystemDark(media.matches)
    const sync = (event) => { if (event.key === KEY || event.key === null) setPreference(stored()) }
    change(); media.addEventListener('change', change); window.addEventListener('storage', sync)
    return () => { media.removeEventListener('change', change); window.removeEventListener('storage', sync) }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#171d27' : '#ffffff')
  }, [resolved])
  return <ThemeContext.Provider value={{ preference, resolved, choose }}>{children}</ThemeContext.Provider>
}
