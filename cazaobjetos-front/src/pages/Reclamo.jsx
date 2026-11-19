import EvidencePicker from '../components/EvidencePicker.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { USE_MOCK, crearReclamo, getHallazgo, misPublicaciones, getExtravio, reportarInformacionIncorrecta } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { ChipHallazgo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import { IconCheck, IconInfo, IconSend, IconShield } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

const MIN = 20


export default function Reclamo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const applying = params.get('solicitar') === '1'
  const toast = useToast()
  const { usuario } = useAuth()
  const requestKey = useRef(crypto.randomUUID())
  const [losses, setLosses] = useState([])
  const [lostReportId, setLostReportId] = useState('')
  const [h, setH] = useState(null)
  const [source, setSource] = useState(null)
  const [sourceError, setSourceError] = useState('')
  const [error, setError] = useState('')
  const [detalles, setDetalles] = useState('')
  const [evidencias, setEvidencias] = useState([])
  const [declaro, setDeclaro] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let active = true
    setH(null); setError(''); setDetalles(''); setEvidencias([]); setDeclaro(false); setLostReportId(''); setEnviando(false); requestKey.current = crypto.randomUUID()
    getHallazgo(id).then((item) => { if (active) setH(item) }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id])

  useEffect(() => { if (!USE_MOCK) misPublicaciones().then((data) => setLosses(data.extravios.filter((loss) => loss.estado === 'activo' && (loss.permisos.vincular ?? loss.permisos.editar)))).catch((error) => setError(error.message)) }, [])

  useEffect(() => {
    if (h?.sourceLostReportId && losses.some((loss) => String(loss.id) === String(h.sourceLostReportId))) setLostReportId(String(h.sourceLostReportId))
  }, [h?.sourceLostReportId, losses])

  useEffect(() => {
    let active = true
    setSource(null); setSourceError('')
    if (h?.sourceLostReportId) getExtravio(h.sourceLostReportId).then((item) => {
      if (active && item.autor?.id === usuario.id) setSource(item)
    }).catch(() => { if (active) setSourceError('No se pudo cargar el reporte para comparar. Puedes abrirlo desde el enlace de la ficha.') })
    return () => { active = false }
  }, [h?.sourceLostReportId, usuario.id])

  const detallesOk = detalles.trim().length >= MIN
  const propio = h && (h.gestor?.id === usuario.id || h.autor?.id === usuario.id)
  const disponible = (USE_MOCK || h?.puedeReclamar) && !h?.reclamoActivoId
  const puedeEnviar = detallesOk && declaro && !enviando && !propio && disponible

  async function enviar() {
    if (enviando || !puedeEnviar) return
    setEnviando(true)
    setError('')
    try {
      const resultado = await crearReclamo({ hallazgoId: h.id, descripcionPrivada: detalles.trim(), declaracion: declaro, evidencias, lostReportId, requestKey: requestKey.current })
      toast('Solicitud guardada. Continúa en los comentarios del expediente.')
      navigate(`/reclamos/${resultado.id}`)
    } catch (e) {
      if (e.status === 409) {
        const updated = await getHallazgo(id).catch(() => null)
        if (updated?.reclamoActivoId) { navigate(`/reclamos/${updated.reclamoActivoId}`); return }
        if (updated) setH(updated)
      }
      setError(e.message)
      setEnviando(false)
    }
  }

  async function reportarIncorrecta() {
    try {
      await reportarInformacionIncorrecta(h.id)
      toast('Gracias. Avisamos a vigilancia para corregir la ficha.')
    } catch (e) { setError(e.message) }
  }

  if (error && !h) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!h) return <p className="empty">Cargando objeto…</p>

  return (
    <>

      <Foto src={h.foto} />
      {h.fotos?.length > 1 && <div className="fotos">{h.fotos.slice(1).map((foto, index) => <figure className="fotos__item" key={foto.id}><img src={foto.url} alt={`Foto ${index + 2}`} /></figure>)}</div>}

      <section className="card">
        <span className="folio">FOLIO {h.folio}</span>
        <h3>{h.titulo}</h3>
        <div><ChipHallazgo estado={h.estado} custodia={h.custodia} /></div>
        <div className="metabox">
          <div><span className="k">HALLAZGO</span> {fechaCorta(h.fecha)}</div>
          <div><span className="k">ENCONTRADO EN</span> {h.lugar}</div>
          <div><span className="k">AHORA ESTÁ</span> {h.custodia ?? 'Con quien lo encontró'}</div>
          <div><span className="k">GESTIONA</span> {h.gestor?.nombre}</div>
        </div>
        {h.descripcionPublica && <p>{h.descripcionPublica}</p>}
        {h.sourceLostReportId && <div className="notice notice--info"><span>Este hallazgo se publicó desde un extravío. Es una posible coincidencia; compara los detalles antes de reclamar. <Link className="link-green" to={`/extravio/${h.sourceLostReportId}`}>Ver reporte original</Link></span></div>}
      </section>

      {source && <section className="card" aria-label="Comparación del objeto"><h2 className="section-title">Compara los dos reportes</h2><div className="comparison-grid"><article><h3>Lo que reportaste</h3><Foto src={source.foto} reference={source.fotos?.[0]?.referenceImage} /><strong>{source.titulo}</strong><p>{fechaCorta(source.fecha)} · {source.lugar}</p><p>{source.descripcion}</p></article><article><h3>Lo que encontraron</h3><Foto src={h.foto} /><strong>{h.titulo}</strong><p>{fechaCorta(h.fecha)} · {h.lugar}</p><p>{h.descripcionPublica}</p></article></div><Link className="btn btn--secondary" to="/?tab=encontrados">Seguir buscando</Link></section>}
      {sourceError && <p className="notice notice--pend">{sourceError}</p>}
      {h.reclamoActivoId && <section className="card"><h2 className="section-title">Ya tienes una solicitud en curso</h2><Link className="btn btn--primary" to={`/reclamos/${h.reclamoActivoId}`}>Ver mi reclamo</Link></section>}
      {propio && <Link className="btn btn--secondary" to="/reclamos?tab=revisar">Ver solicitudes que gestiono</Link>}
      {!propio && !h.reclamoActivoId && !disponible && <p className="notice notice--info">Este hallazgo ya no admite solicitudes nuevas.</p>}
      {disponible && !propio && !applying && <section className="card"><p>Compara la foto, la fecha y el lugar con lo que perdiste.</p><button type="button" className="btn btn--primary" onClick={() => setParams({ solicitar: '1' })}>Creo que es mío</button></section>}
      {disponible && !propio && applying && <section className="card" aria-label="Solicitud de reclamo">
        <h2 className="section-title"><IconShield width={20} height={20} /> Solicitar este objeto</h2>
        <div className="notice notice--info">
          <IconInfo width={20} height={20} />
          <span>Describe datos no visibles en la foto que demuestren tu propiedad. El responsable revisará tu solicitud. Puedes añadir pruebas y continuar la conversación en los comentarios privados del reclamo.</span>
        </div>
        {propio && <div className="notice notice--pend"><span>Tú gestionas este objeto, así que no puedes reclamarlo.</span></div>}

        {losses.length > 0 && <div className="field"><label htmlFor="linked-loss">Vincular con un extravío mío (opcional)</label><select id="linked-loss" className="select" value={lostReportId} onChange={(event) => setLostReportId(event.target.value)}><option value="">Sin vincular</option>{losses.map((loss) => <option key={loss.id} value={loss.id}>{loss.titulo}</option>)}</select></div>}
        <div className="field">
          <label htmlFor="detalles">
            Detalles que prueban que es tuyo <span className="chip chip--req">Obligatorio</span>
          </label>
          <textarea id="detalles" className="textarea" disabled={enviando} maxLength={2000} placeholder="ej. qué hay dentro del bolsillo frontal, marca del llavero, stickers…" value={detalles} onChange={(e) => setDetalles(e.target.value)} aria-describedby="detalles-ayuda detalles-privacidad" />
          <span id="detalles-ayuda" className={`help ${detalles && !detallesOk ? 'help--error' : ''}`}>
            Mín. {MIN} caracteres ({detalles.trim().length}/{MIN})
          </span>
          <p className="account-help" id="detalles-privacidad">Estos detalles son privados. Solo tú y la persona que revisa tu solicitud pueden verlos.</p>
        </div>

        <EvidencePicker files={evidencias} onChange={setEvidencias} disabled={enviando} />

        <div className="field">
          <span className="label">Identificación institucional</span>
          <div className="notice notice--ok">
            <IconCheck width={20} height={20} />
            <span className="mono" style={{ fontSize: 13 }}>
              {usuario.correo} · {usuario.nombre}
            </span>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" disabled={enviando} checked={declaro} onChange={(e) => setDeclaro(e.target.checked)} />
          <span><b>Declaración:</b> Declaro bajo protesta que soy el legítimo propietario de este objeto.</span>
        </label>

        {error && <div className="notice notice--peligro" role="alert">{error}</div>}

        <button className="btn btn--primary" disabled={!puedeEnviar} onClick={enviar}>
          <IconSend width={18} height={18} /> {enviando ? 'Guardando solicitud y evidencias…' : 'Enviar solicitud de reclamo'}
        </button>
        <button type="button" className="btn btn--secondary" disabled={enviando} onClick={() => setParams({})}>Volver a la ficha</button>
        {USE_MOCK && <button className="btn btn--secondary" onClick={reportarIncorrecta}>Reportar como información incorrecta</button>}
      </section>}
    </>
  )
}
