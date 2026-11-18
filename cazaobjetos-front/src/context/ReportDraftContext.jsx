import { createContext, useContext, useEffect, useRef, useState } from 'react'

const ReportDraftContext = createContext(null)
export function ReportDraftProvider({ children }) {
  const drafts = useRef(new Map())
  useEffect(() => {
    const warn = (event) => {
      if (![...drafts.current.values()].some((draft) => draft.dirty)) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  return <ReportDraftContext.Provider value={drafts.current}>{children}</ReportDraftContext.Provider>
}
export const useReportDrafts = () => useContext(ReportDraftContext)

export function useReportDraft(key, initial) {
  const drafts = useContext(ReportDraftContext)
  const [draft, setLocal] = useState(() => (key && drafts.get(key)) || initial())
  function setDraft(update) {
    setLocal((previous) => {
      const next = typeof update === 'function' ? update(previous) : update
      if (key) drafts.set(key, { ...next, dirty: true })
      return { ...next, dirty: true }
    })
  }
  function clear() { if (key) drafts.delete(key) }
  function reset(replacement) { clear(); setLocal(replacement || initial()) }
  return [draft, setDraft, clear, reset]
}
