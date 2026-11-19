import { useEffect, useState } from 'react'
import { getRegistrationOptions } from './api.js'

export default function useRegistrationOptions() {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ loading: true, demoVerification: false, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    setState((current) => ({ ...current, loading: true, error: '' }))
    getRegistrationOptions(controller.signal).then((options) => {
      if (!controller.signal.aborted) setState({ loading: false, demoVerification: options.demoVerification === true, error: '' })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ loading: false, demoVerification: false, error: 'No pudimos cargar las opciones de registro.' })
    })
    return () => controller.abort()
  }, [revision])
  return { ...state, retry: () => setRevision((value) => value + 1) }
}
