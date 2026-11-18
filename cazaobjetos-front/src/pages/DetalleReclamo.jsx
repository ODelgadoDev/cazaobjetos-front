import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import { ESTADOS_RECLAMO, ETAPAS } from '../lib/constants.js'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipReclamo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import { IconCheck, IconMail, IconShield, IconX } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

function Progreso({ estado }) {
  const etapa = ESTADOS_RECLAMO[estado]?.etapa ?? 1
  const cerradoSinEntrega = ['rechazado', 'cancelado', 'cerrado'].includes(estado)
  return (
    <div className="metabox">
      <div className="mono muted">{cerradoSinEntrega ? 'RECLAMO CERRADO' : `ETAPA ${etapa} DE 4`}</div>
      <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={etapa}>
        {ETAPAS.map((_, i) => <i key={i} className={i < etapa && !cerradoSinEntrega ? 'on' : ''} />)}
      </div>
      <div className="progress-labels">
        {ETAPAS.map((e, i) => <span key={e} className={i === etapa - 1 && !cerradoSinEntrega ? 'on' : ''}>{e}</span>)}
      </div>
    </div>
  )
}

/** Acción que requiere un texto (motivo del rechazo, pruebas pedidas o respuesta). */
function AccionTexto({ etiqueta, placeholder, boton, tipoBoton = 'btn--primary', min = 10, onEnviar, onCancelar }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <div className="inline-form">
      <div className="field">
        <label htmlFor="accion-texto">{etiqueta}</label>
        <textarea id="accion-texto" className="textarea" placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <span className="help">MÍN. {min} CARACTERES ({texto.trim().length}/{min})</span>
      </div>
      <div className="btn-row">
        <button className="btn btn--secondary" onClick={onCancelar}>Cancelar</button>
        <button className={`btn ${tipoBoton}`} disabled={texto.trim().length < min || enviando} onClick={async () => { setEnviando(true); await onEnviar(texto.trim()); setEnviando(false) }}>{boton}</button>
      </div>
    </div>
  )
}

export default function DetalleReclamo() {
  const { id } = useParams()
  const toast = useToast()
  const [r, setR] = useState(null)
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState(null) // 'rechazar' | 'pruebas' | 'responder'

  const cargar = useCallback(() => { api.getReclamo(id).then((d) => { setR(d); setError('') }).catch((e) => setError(e.message)) }, [id])
  useEffect(cargar, [cargar])

  async function run(fn, mensaje) {
    setError('')
    try { await fn(); toast(mensaje); setAbierto(null); cargar() } catch (e) { setError(e.message) }
  }

  if (error && !r) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!r) return <p className="empty">Cargando reclamo…</p>

  const p = r.permisos || {}
  const soySolicitante = r.rolEnReclamo === 'solicitante'
  const h = r.hallazgo

  return (
    <>
      <section className="card">
        <div className="pager"><span className="folio">{r.folio}</span><ChipReclamo estado={r.estado} /></div>
        <h3>{r.titulo}</h3>
        <div className="chips">
          <Chip tipo="info">{soySolicitante ? 'Enviado por ti' : 'Recibido · lo gestionas tú'}</Chip>
          <Chip>Creado {fechaCorta(r.creado)}</Chip>
        </div>
        <Progreso estado={r.estado} />
      </section>

      {/* Mensajes de estado */}
      {r.estado === 'requiere_pruebas' && (
        <div className="notice notice--pend"><span><b>{soySolicitante ? 'Te piden más información:' : 'Pediste más información:'}</b> {r.observaciones || 'Un detalle que solo el dueño conozca.'}</span></div>
      )}
      {r.estado === 'aprobado' && (
        <div className="notice notice--ok">
          <span>
            {soySolicitante
              ? <>Aprobado. Recógelo {h?.custodia ? <>en <b>{h.custodia}</b></> : 'en el encuentro que acuerden por correo'} con tu credencial.</>
              : 'Aprobado. Coordina la entrega por correo; el solicitante confirmará cuando lo reciba.'}
          </span>
        </div>
      )}
      {r.estado === 'rechazado' && <div className="notice notice--peligro"><span><b>Rechazado.</b> {r.observaciones}</span></div>}
      {r.estado === 'cancelado' && <div className="notice notice--pend"><span>El solicitante canceló este reclamo.</span></div>}
      {r.estado === 'entregado' && r.entrega && (
        <div className="metabox">
          <div><span className="k">ENTREGA</span> {fechaCorta(r.entrega.fecha)}</div>
          <div><span className="k">CIERRE</span> {r.entrega.agente}</div>
        </div>
      )}

      {/* Objeto */}
      {h && (
        <section className="card">
          <h2 className="section-title">Objeto</h2>
          <Foto folio={h.folio} src={h.foto} />
          <div className="metabox">
            <div><span className="k">LUGAR</span> {h.lugar}</div>
            <div><span className="k">RESGUARDO</span> {h.custodia ?? 'Con quien lo encontró'}</div>
          </div>
          <Link className="link-green" to={`/reclamo/${h.id}`}>Ver ficha del objeto</Link>
        </section>
      )}

      {/* Datos privados: solo los ven solicitante y responsable */}
      <section className="card">
        <h2 className="section-title"><IconShield width={20} height={20} /> Datos privados</h2>
        <p className="help" style={{ margin: 0 }}>SOLO LOS VEN EL SOLICITANTE Y EL RESPONSABLE</p>
        <div className="field">
          <span className="label">Detalles que prueban la propiedad</span>
          <div className="quote" style={{ whiteSpace: 'pre-line' }}>“{r.descripcionPrivada}”</div>
        </div>
        <div className="field">
          <span className="label">Evidencia</span>
          {r.evidencia
            ? (r.evidencia.url ? <a className="link-green" href={r.evidencia.url} target="_blank" rel="noreferrer">{r.evidencia.nombre}</a> : <span className="mono">{r.evidencia.nombre}</span>)
            : <span className="muted">Sin archivo adjunto.</span>}
        </div>
      </section>

      {/* Contacto institucional */}
      <section className="card">
        <h2 className="section-title"><IconMail width={20} height={20} /> Contacto institucional</h2>
        {soySolicitante ? (
          r.gestor && (
            <div className="metabox">
              <div><span className="k">RESPONSABLE</span> {r.gestor.nombre}</div>
              <div><span className="k">CORREO</span> <a href={`mailto:${r.gestor.correo}?subject=${encodeURIComponent(`Reclamo ${r.folio}`)}`}>{r.gestor.correo}</a></div>
              {h?.custodia && <div><span className="k">RESGUARDO</span> {h.custodia}</div>}
            </div>
          )
        ) : (
          <div className="metabox">
            <div><span className="k">SOLICITANTE</span> {r.solicitante.nombre}</div>
            <div><span className="k">CORREO</span> <a href={`mailto:${r.solicitante.correo}?subject=${encodeURIComponent(`Reclamo ${r.folio}`)}`}>{r.solicitante.correo}</a></div>
            {r.solicitante.matricula && <div><span className="k">MATRÍCULA</span> {r.solicitante.matricula}</div>}
            {r.solicitante.carrera && <div><span className="k">CARRERA</span> {r.solicitante.carrera}</div>}
          </div>
        )}
        <p className="muted" style={{ margin: 0 }}>Comuníquense solo por correo institucional. Nunca compartas datos personales fuera de la plataforma.</p>
      </section>

      {error && <div className="notice notice--peligro" role="alert">{error}</div>}

      {/* Acciones del responsable */}
      {(p.iniciarRevision || p.aceptar || p.rechazar || p.pedirPruebas) && (
        <section className="card">
          <h2 className="section-title">Tu decisión</h2>
          {abierto === 'rechazar' && (
            api.USE_MOCK ? <AccionTexto etiqueta="Motivo del rechazo" placeholder="ej. Los detalles no coinciden con el objeto." boton="Rechazar reclamo" tipoBoton="btn--danger"
              onCancelar={() => setAbierto(null)} onEnviar={(t) => run(() => api.rechazarReclamo(r.id, t), 'Reclamo rechazado.')} /> : <div className="btn-row"><button className="btn btn--secondary" onClick={() => setAbierto(null)}>Cancelar</button><button className="btn btn--danger" onClick={() => run(() => api.rechazarReclamo(r.id), 'Reclamo rechazado.')}>Rechazar reclamo</button></div>
          )}
          {abierto === 'pruebas' && (
            <AccionTexto etiqueta="¿Qué información adicional necesitas?" placeholder="ej. ¿Qué archivos tiene en la carpeta principal?" boton="Pedir pruebas"
              onCancelar={() => setAbierto(null)} onEnviar={(t) => run(() => api.pedirPruebas(r.id, t), 'Se pidió más información.')} />
          )}
          {!abierto && (
            <>
              {p.aceptar && (
                <button className="btn btn--primary" onClick={() => { if (window.confirm('¿Aceptas el reclamo? Confirmas que la propiedad está validada.')) run(() => api.aprobarReclamo(r.id), 'Reclamo aceptado. Coordina la entrega por correo.') }}>
                  <IconCheck width={18} height={18} /> Aceptar reclamo
                </button>
              )}
              <div className="btn-row">
                {p.iniciarRevision && <button className="btn btn--secondary" onClick={() => run(() => api.iniciarRevision(r.id), 'Revisión iniciada.')}>Iniciar revisión</button>}
                {p.pedirPruebas && <button className="btn btn--secondary" onClick={() => setAbierto('pruebas')}>Pedir pruebas</button>}
                {p.rechazar && <button className="btn btn--danger" onClick={() => setAbierto('rechazar')}>Rechazar</button>}
              </div>
            </>
          )}
        </section>
      )}

      {/* Acciones del solicitante */}
      {(p.responder || p.confirmarRecibido || p.cancelar) && (
        <section className="card">
          {abierto === 'responder' ? (
            <AccionTexto etiqueta="Tu respuesta" placeholder="Escribe el detalle que te pidieron" boton="Enviar respuesta"
              onCancelar={() => setAbierto(null)} onEnviar={(t) => run(() => api.responderPruebas(r.id, t), 'Respuesta enviada.')} />
          ) : (
            <>
              {p.responder && <button className="btn btn--primary" onClick={() => setAbierto('responder')}>Responder</button>}
              {p.confirmarRecibido && (
                <button className="btn btn--primary" onClick={() => { if (window.confirm('¿Confirmas que ya tienes tu objeto? Se cerrará el reclamo.')) run(() => api.marcarRecuperado(r.id), 'Listo. Reclamo cerrado.') }}>
                  <IconCheck width={18} height={18} /> Ya recibí mi objeto
                </button>
              )}
              {p.cancelar && (
                <button className="btn btn--link-danger" onClick={() => { if (window.confirm(`¿Cancelar el reclamo ${r.folio}? El objeto quedará disponible para otros.`)) run(() => api.cancelarReclamo(r.id), 'Reclamo cancelado.') }}>
                  <IconX width={18} height={18} /> Cancelar reclamo
                </button>
              )}
            </>
          )}
        </section>
      )}
    </>
  )
}
