import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LostResponseCustodyFields, { DEFAULT_OFFICE } from '../components/LostResponseCustodyFields.jsx'
import PersonName from '../components/PersonName.jsx'
import ImageAttachment from '../components/ImageAttachment.jsx'
import { useToast } from '../components/Toast.jsx'
import { getExtravio, USE_MOCK } from '../lib/api.js'
import { createLostResponse, getLostResponses } from '../lib/lostResponses.js'
import './lostResponses.css'

export default function ResponderExtravio() {
  const { id } = useParams()
  return <ResponseForm key={id} id={id} />
}

function ResponseForm({ id }) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [report, setReport] = useState(null)
  const [existing, setExisting] = useState(null)
  const [location, setLocation] = useState('')
  const [body, setBody] = useState('')
  const [custody, setCustody] = useState('WITH_FINDER')
  const [custodyLocation, setCustodyLocation] = useState(DEFAULT_OFFICE)
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attempt = useRef(null)
  const mounted = useRef(false)
  const reportPath = `/extravio/${id}`

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    const responses = USE_MOCK ? Promise.resolve([]) : getLostResponses(id, controller.signal)
    Promise.all([getExtravio(id), responses]).then(([loaded, replies]) => {
      if (!mounted.current || controller.signal.aborted) return
      setReport(loaded)
      setExisting(replies.find((reply) => reply.finderId === usuario.id && reply.status === 'OPEN'))
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err.message)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => { mounted.current = false; controller.abort() }
  }, [id, usuario.id])

  async function send(event) {
    event.preventDefault()
    const fields = { location: location.trim(), body: body.trim(), image, custody, custodyLocation: custody === 'OFFICE' ? custodyLocation.trim() : null }
    if (busy || !fields.location || !fields.body) return
    const previous = attempt.current
    if (!previous || previous.location !== fields.location || previous.body !== fields.body || previous.image !== image || previous.custody !== custody || previous.custodyLocation !== fields.custodyLocation) {
      attempt.current = { ...fields, key: crypto.randomUUID() }
    }
    setBusy(true)
    setError('')
    try {
      const response = await createLostResponse(id, fields, attempt.current.key)
      if (!mounted.current) return
      toast('Respuesta enviada.')
      navigate(`${reportPath}#respuesta-${response.id}`, { replace: true })
    } catch (err) {
      if (!mounted.current) return
      if (err.status === 409) {
        const replies = await getLostResponses(id).catch(() => [])
        if (!mounted.current) return
        const open = replies.find((reply) => reply.finderId === usuario.id && reply.status === 'OPEN')
        if (open) {
          navigate(`${reportPath}#respuesta-${open.id}`, { replace: true })
          return
        }
      }
      setError(err.message)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  if (loading) return <p className="empty">Cargando reporte…</p>
  const reason = error || (USE_MOCK ? 'Las respuestas requieren una conexión con el servicio.' : '')
  if (!report || USE_MOCK || existing || report.estado !== 'activo' || report.autor?.id === usuario.id) {
    return <section className="card">
      <p role={reason ? 'alert' : undefined}>{reason || (existing ? 'Ya enviaste una respuesta.' : 'Este reporte no admite respuestas nuevas.')}</p>
      <Link className="btn btn--secondary" to={existing ? `${reportPath}#respuesta-${existing.id}` : reportPath}>Ver reporte</Link>
    </section>
  }
  return <form className="card" onSubmit={send}>
    <p className="lost-response__byline"><PersonName name={usuario.nombre} degree={usuario.carrera} />{report.autor?.nombre && <> → <PersonName name={report.autor.nombre} degree={report.autor.carrera} /></>}</p>
    <div className="field">
      <label htmlFor="response-location">¿Dónde lo encontraste?</label>
      <input id="response-location" className="input" value={location} onChange={(event) => setLocation(event.target.value)} required maxLength={200} disabled={busy} />
    </div>
    <div className="field">
      <label htmlFor="response-body">Mensaje privado</label>
      <textarea id="response-body" className="textarea" value={body} onChange={(event) => setBody(event.target.value)} required maxLength={2000} disabled={busy} />
    </div>
    <LostResponseCustodyFields custody={custody} location={custodyLocation} onCustodyChange={setCustody} onLocationChange={setCustodyLocation} disabled={busy} />
    <ImageAttachment compact value={image} onChange={setImage} disabled={busy} />
    {error && <div className="notice notice--peligro" role="alert">{error}</div>}
    <button type="submit" className="btn btn--primary" disabled={busy || !location.trim() || !body.trim()}>{busy ? 'Enviando…' : 'Enviar respuesta'}</button>
    {!busy && <Link className="link-green" to={reportPath}>Cancelar</Link>}
  </form>
}
