import FormHelp from '../components/FormHelp.jsx'
import PersonName from '../components/PersonName.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { USE_MOCK, crearReclamo, getHallazgo, misExtraviosParaReclamo } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { usePush } from '../context/PushContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { ChipHallazgo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import EvidencePicker, { selectedEvidenceUrls } from '../components/EvidencePicker.jsx'
import { fechaCorta } from '../lib/format.js'
import './flujo-simple.css'

const MIN_DESCRIPTION = 10

export default function Reclamo() {
  const { id } = useParams()
  return <Hallazgo key={id} id={id} />
}

function Hallazgo({ id }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const applying = params.get('solicitar') === '1'
  const toast = useToast()
  const { claimSubmitted } = usePush()
  const { usuario } = useAuth()
  const requestKey = useRef(crypto.randomUUID())
  const [losses, setLosses] = useState([])
  const [lostReportId, setLostReportId] = useState('')
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState({ files: [], urls: [], draftUrl: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    getHallazgo(id).then((found) => { if (active) setItem(found) }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!applying || USE_MOCK) return
    let active = true
    misExtraviosParaReclamo().then((items) => {
      if (active) setLosses(items)
    }).catch(() => {})
    return () => { active = false }
  }, [applying])

  useEffect(() => {
    if (item?.sourceLostReportId && losses.some((loss) => String(loss.id) === String(item.sourceLostReportId))) {
      setLostReportId(String(item.sourceLostReportId))
    }
  }, [item?.sourceLostReportId, losses])

  async function send(event) {
    event.preventDefault()
    if (!canSend) return
    setSending(true); setError('')
    try {
      const evidenceUrls = selectedEvidenceUrls(photos)
      const result = await crearReclamo({
        hallazgoId: item.id,
        descripcionPrivada: description.trim(),
        evidencias: photos.files,
        evidenceUrls,
        lostReportId,
        requestKey: requestKey.current,
      })
      claimSubmitted(result.id)
      toast('Solicitud enviada.')
      navigate(`/reclamos/${result.id}`)
    } catch (e) {
      if (e.status === 409) {
        const updated = await getHallazgo(id).catch(() => null)
        if (updated?.miSolicitudId) { navigate(`/reclamos/${updated.miSolicitudId}`); return }
        if (updated) setItem(updated)
      }
      setError(e.message)
      setSending(false)
    }
  }

  if (!item) {
    return error ? <p className="notice notice--peligro" role="alert">{error}</p> : <p className="empty">Cargando hallazgo…</p>
  }
  const own = item.gestor?.id === usuario.id || item.autor?.id === usuario.id
  const available = USE_MOCK ? !['entregado', 'retirado'].includes(item.estado) : item.puedeReclamar
  const canApply = !own && available && !item.miSolicitudId
  const canSend = canApply && !sending && description.trim().length >= MIN_DESCRIPTION

  if (applying && canApply) return (
    <form className="card claim-form-simple" onSubmit={send}>
      <h2>Solicitar devolución</h2>
      <FormHelp title="Cómo solicitar la devolución">
        Escribe una seña privada y envía la solicitud. Quien encontró el objeto la revisará. Después puedes acordar la entrega en Solicitudes.
      </FormHelp>
      <p className="muted">{item.titulo} · {usuario.nombre}</p>
      <div className="field">
        <label htmlFor="detalles">¿Qué detalle del objeto solo tú conoces?</label>
        <textarea id="detalles" className="textarea" required maxLength={2000}
          placeholder="Ej. Tiene mis iniciales debajo de la funda" value={description} disabled={sending}
          aria-describedby="claim-description-hint" onChange={(e) => setDescription(e.target.value)} />
        <p id="claim-description-hint" className="account-help">Respuesta privada · mínimo {MIN_DESCRIPTION} caracteres.</p>
      </div>
      <EvidencePicker files={photos.files} urls={photos.urls} draftUrl={photos.draftUrl}
        onDraftUrlChange={(draftUrl) => setPhotos((current) => ({ ...current, draftUrl }))} disabled={sending} onChange={(files, urls) => setPhotos({ files, urls })} />
      {losses.length > 0 && <div className="field">
        <label htmlFor="linked-loss">Vincular mi reporte perdido <span className="account-optional">Opcional</span></label>
        <FormHelp title="Para qué sirve vincular un reporte">
          Si ya publicaste que perdiste este objeto, elige ese reporte para asociarlo con tu solicitud.
        </FormHelp>
          <select className="select" id="linked-loss" disabled={sending} value={lostReportId} onChange={(e) => setLostReportId(e.target.value)}>
            <option value="">Sin vincular</option>
            {losses.map((loss) => <option key={loss.id} value={loss.id}>{loss.titulo}</option>)}
          </select>
      </div>}
      {error && <p className="notice notice--peligro" role="alert">{error}</p>}
      <div className="btn-row">
        <button className="btn btn--primary" disabled={!canSend}>{sending ? 'Enviando…' : 'Enviar solicitud'}</button>
        <button type="button" className="btn btn--secondary" disabled={sending} onClick={() => setParams({})}>Volver</button>
      </div>
    </form>
  )

  return (
    <section className="card claim-form-simple" aria-label="Hallazgo">
      <div className="pager"><span className="folio">{item.folio}</span><ChipHallazgo estado={item.estado} /></div>
      <h2>{item.titulo}</h2>
      <p className="muted">Publicado por <PersonName name={item.autor?.nombre || item.gestor?.nombre || 'Usuario UTCH'} degree={item.autor?.carrera || item.gestor?.carrera} /></p>
      <p>{item.lugar} · {fechaCorta(item.fecha)}</p>
      {item.custodia && <p>{item.custodia}</p>}
      {item.descripcionPublica && <p>{item.descripcionPublica}</p>}
      {(item.foto || item.estado === 'entregado') && <Foto src={item.foto} reference={item.fotos?.[0]?.referenceImage} delivered={item.estado === 'entregado'} />}
      {item.fotos?.length > 1 && <details className="claim-attachments">
        <summary>Más fotos</summary>
        <div className="fotos">{item.fotos.slice(1).map((photo, index) => <figure className="fotos__item" key={photo.id}>
          <img src={photo.url} alt={`Foto ${index + 2}`} loading="lazy" referrerPolicy="no-referrer" />
        </figure>)}</div>
      </details>}
      {item.sourceLostReportId && <Link className="link-green" to={`/extravio/${item.sourceLostReportId}`}>Ver extravío vinculado</Link>}
      {item.miSolicitudId && <Link className="btn btn--primary" to={`/reclamos/${item.miSolicitudId}`}>Ver mi solicitud</Link>}
      {own && <Link className="btn btn--secondary" to="/reclamos?tab=revisar">Ver solicitudes recibidas</Link>}
      {canApply && <button type="button" className="btn btn--primary" onClick={() => setParams({ solicitar: '1' })}>Solicitar devolución</button>}
    </section>
  )
}
