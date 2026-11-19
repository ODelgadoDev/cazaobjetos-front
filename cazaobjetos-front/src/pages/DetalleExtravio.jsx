import PersonName from '../components/PersonName.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import { getExtravio, getPosiblesHallazgos, marcarExtravioRecuperado, USE_MOCK } from '../lib/api.js'
import { getLostResponses } from '../lib/lostResponses.js'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipExtravio } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import LostResponseThread from '../components/LostResponseThread.jsx'
import { fechaCorta } from '../lib/format.js'
import './lostResponses.css'

export default function DetalleExtravio() {
  const { id } = useParams()
  return <LostReport key={id} id={id} />
}

function LostReport({ id }) {
  const { usuario } = useAuth()
  const { version } = useNotifications()
  const { hash } = useLocation()
  const toast = useToast()
  const [report, setReport] = useState(null)
  const [replies, setReplies] = useState([])
  const [legacy, setLegacy] = useState(null)
  const [revision, setRevision] = useState(0)
  const [legacyPage, setLegacyPage] = useState(0)
  const reportRequest = useRef(0)
  const [error, setError] = useState('')
  const [repliesError, setRepliesError] = useState('')
  const [loadingReplies, setLoadingReplies] = useState(!USE_MOCK)
  const [busy, setBusy] = useState(false)

  const loadReport = useCallback(async () => {
    const sequence = ++reportRequest.current
    try {
      const next = await getExtravio(id)
      if (sequence !== reportRequest.current) return
      setReport(next)
      setError('')
    } catch (err) {
      if (sequence !== reportRequest.current) return
      if ([401, 403, 404].includes(err.status)) setReport(null)
      setError(err.message)
    }
  }, [id])

  useEffect(() => { loadReport() }, [loadReport, version])

  useEffect(() => {
    if (USE_MOCK) return
    const controller = new AbortController()
    getLostResponses(id, controller.signal).then((items) => {
      setReplies(items)
      setRepliesError('')
    }).catch((err) => {
      if (err.name !== 'AbortError') setRepliesError(err.message)
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingReplies(false)
    })
    return () => controller.abort()
  }, [id, version, revision])

  const mine = report?.autor?.id === usuario.id
  useEffect(() => {
    if (!mine) return
    let active = true
    getPosiblesHallazgos(id, legacyPage).then((result) => {
      if (active) setLegacy(result)
    }).catch(() => {})
    return () => { active = false }
  }, [id, mine, legacyPage])

  async function refreshResponse(updated) {
    if (updated?.id) setReplies((current) => current.map((row) => row.id === updated.id ? updated : row))
    setRevision((value) => value + 1)
    await loadReport()
  }

  async function recover() {
    if (busy || !window.confirm('¿Ya tienes el objeto?')) return
    setBusy(true)
    try {
      await marcarExtravioRecuperado(id)
      toast('Objeto recuperado.')
      await loadReport()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!report) return error
    ? <div className="notice notice--peligro" role="alert">{error}</div>
    : <p className="empty">Cargando reporte…</p>

  const openResponses = report.tieneRespuesta || replies.some((response) => response.status === 'OPEN')
  const active = report.estado === 'activo'
  const permissions = report.permisos || {}
  const previous = replies.find((response) => response.finderId === usuario.id && response.status === 'OPEN')

  return <>
    <section className="card lost-response">
      <div className="lost-response__head">
        <h2>{report.titulo}</h2>
        {active && openResponses ? <Chip tipo="ok">Posible hallazgo</Chip> : <ChipExtravio estado={report.estado} />}
      </div>
      <div className="lost-response__byline">
        <PersonName name={report.autor?.nombre} degree={report.autor?.carrera} />
        <time dateTime={report.fecha}>{fechaCorta(report.fecha)}</time>
      </div>
      <div>{report.lugar} · {report.categoria}</div>
      {report.descripcion && <p className="lost-response__body">{report.descripcion}</p>}
      {report.foto && <Foto src={report.foto} reference={report.fotos?.[0]?.referenceImage} />}
      {report.fotos?.length > 1 && <div className="fotos">{report.fotos.slice(1).map((f, index) =>
        <figure key={f.id} className="fotos__item"><img src={f.url} alt={`Foto ${index + 2}`} loading="lazy" />
          {f.referenceImage && <figcaption className="photo__reference">Imagen de referencia</figcaption>}
        </figure>
      )}</div>}
      {mine && (permissions.editar || active) && <div className="btn-row">
        {permissions.editar && <Link className="btn btn--secondary" to={`/editar/extravio/${id}`}>Editar reporte</Link>}
        {permissions.marcarRecuperado && !openResponses && !loadingReplies && <button className="btn btn--secondary" type="button" onClick={recover} disabled={busy}>Ya lo recuperé</button>}
        {active && !permissions.marcarRecuperado && !openResponses && <Link className="btn btn--secondary" to="/reclamos">Ver reclamos</Link>}
      </div>}
      {!mine && !USE_MOCK && active && !previous && !loadingReplies && !repliesError && <Link className="btn btn--primary" to={`/extravio/${id}/responder`}>Lo encontré</Link>}
    </section>

    {error && <div className="notice notice--peligro" role="alert">{error}</div>}
    {repliesError && <div className="notice notice--peligro" role="alert">{repliesError}</div>}
    {replies.length > 0 && <section className="lost-responses" aria-label="Respuestas privadas">
      <h2 className="section-title">Respuestas</h2>
      {replies.map((response) => <LostResponseThread key={response.id} response={response} reportActive={active}
        selected={hash === `#respuesta-${response.id}`} onChanged={refreshResponse} />)}
    </section>}
    {(legacy?.items.length > 0 || legacyPage > 0) && <section className="card">
      <h2 className="section-title">Hallazgos vinculados</h2>
      <div className="lost-legacy-links">{legacy?.items.map((item) => <Link className="link-green" key={item.id} to={`/reclamo/${item.id}`}>{item.titulo}</Link>)}</div>
      {(legacy?.totalPages > 1 || legacyPage > 0) && <div className="btn-row">
        <button className="btn btn--secondary" type="button" disabled={legacyPage === 0} onClick={() => setLegacyPage((page) => page - 1)}>Anteriores</button>
        <button className="btn btn--secondary" type="button" disabled={!legacy?.hasNext} onClick={() => setLegacyPage((page) => page + 1)}>Siguientes</button>
      </div>}
    </section>}
  </>
}
