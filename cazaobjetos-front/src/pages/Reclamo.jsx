import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { USE_MOCK, crearReclamo, getHallazgo, misExtraviosParaReclamo } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { usePush } from '../context/PushContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { ChipHallazgo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import EvidencePicker from '../components/EvidencePicker.jsx'
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
  const [photos, setPhotos] = useState({ files: [], urls: [] })
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
      const result = await crearReclamo({
        hallazgoId: item.id,
        descripcionPrivada: description.trim(),
        evidencias: photos.files,
        evidenceUrls: photos.urls,
        lostReportId,
        requestKey: requestKey.current,
      })
      claimSubmitted(result.id)
      toast('Reclamo enviado.')
      navigate(`/reclamos/${result.id}`)
    } catch (e) {
      if (e.status === 409) {
        const updated = await getHallazgo(id).catch(() => null)
        if (updated?.reclamoActivoId) { navigate(`/reclamos/${updated.reclamoActivoId}`); return }
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
  const canApply = !own && available && !item.reclamoActivoId
  const canSend = canApply && !sending && description.trim().length >= MIN_DESCRIPTION

  if (applying && canApply) return (
    <form className="card claim-form-simple" onSubmit={send}>
      <h2>Reclamar objeto</h2>
      <p className="muted">{item.titulo} · {usuario.nombre}</p>
      <div className="field">
        <label htmlFor="detalles">¿Cómo sabes que es tuyo?</label>
        <textarea id="detalles" className="textarea" required maxLength={2000}
          placeholder="Un detalle que lo distinga" value={description} disabled={sending}
          aria-describedby="claim-description-hint" onChange={(e) => setDescription(e.target.value)} />
        <p id="claim-description-hint" className="account-help">Respuesta privada · mínimo {MIN_DESCRIPTION} caracteres.</p>
      </div>
      <EvidencePicker files={photos.files} urls={photos.urls} disabled={sending} onChange={(files, urls) => setPhotos({ files, urls })} />
      {losses.length > 0 && <details className="claim-attachments" open={Boolean(item.sourceLostReportId) || undefined}>
        <summary>Vincular mi extravío</summary>
        <div className="claim-section__body">
          <select className="select" aria-label="Mi extravío" disabled={sending} value={lostReportId} onChange={(e) => setLostReportId(e.target.value)}>
            <option value="">Sin vincular</option>
            {losses.map((loss) => <option key={loss.id} value={loss.id}>{loss.titulo}</option>)}
          </select>
        </div>
      </details>}
      {error && <p className="notice notice--peligro" role="alert">{error}</p>}
      <div className="btn-row">
        <button className="btn btn--primary" disabled={!canSend}>{sending ? 'Enviando…' : 'Enviar reclamo'}</button>
        <button type="button" className="btn btn--secondary" disabled={sending} onClick={() => setParams({})}>Volver</button>
      </div>
    </form>
  )

  return (
    <section className="card claim-form-simple" aria-label="Hallazgo">
      <div className="pager"><span className="folio">{item.folio}</span><ChipHallazgo estado={item.estado} /></div>
      <h2>{item.titulo}</h2>
      <p className="muted">Publicado por {item.autor?.nombre || item.gestor?.nombre || 'Usuario UTCH'}</p>
      <p>{item.lugar} · {fechaCorta(item.fecha)}</p>
      {item.custodia && <p>{item.custodia}</p>}
      {item.descripcionPublica && <p>{item.descripcionPublica}</p>}
      {item.foto && <Foto src={item.foto} reference={item.fotos?.[0]?.referenceImage} />}
      {item.fotos?.length > 1 && <details className="claim-attachments">
        <summary>Más fotos</summary>
        <div className="fotos">{item.fotos.slice(1).map((photo, index) => <figure className="fotos__item" key={photo.id}>
          <img src={photo.url} alt={`Foto ${index + 2}`} loading="lazy" referrerPolicy="no-referrer" />
        </figure>)}</div>
      </details>}
      {item.sourceLostReportId && <Link className="link-green" to={`/extravio/${item.sourceLostReportId}`}>Ver extravío vinculado</Link>}
      {item.reclamoActivoId && <Link className="btn btn--primary" to={`/reclamos/${item.reclamoActivoId}`}>Ver mi reclamo</Link>}
      {own && <Link className="btn btn--secondary" to="/reclamos?tab=revisar">Ver reclamos</Link>}
      {canApply && <button type="button" className="btn btn--primary" onClick={() => setParams({ solicitar: '1' })}>Reclamar objeto</button>}
    </section>
  )
}
