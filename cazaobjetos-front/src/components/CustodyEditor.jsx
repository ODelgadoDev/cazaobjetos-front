import FormHelp from './FormHelp.jsx'
import ChoiceField from './ChoiceField.jsx'
import { useId, useState } from 'react'
import { cambiarResguardo } from '../lib/api.js'

export function CustodyFields({ value, onChange, disabled = false, officeLocked = false, allowTeacher = false }) {
  const prefix = useId()
  const set = (field) => (event) => onChange({ ...value, [field]: event.target.value, officeConfirmed: false })
  return (
    <fieldset className="custody-fields" disabled={disabled}>
      <ChoiceField label="¿Dónde está ahora el objeto?" value={value.resguardo} options={officeLocked
        ? [['oficina', 'Lo dejé en oficina']]
        : [['persona', 'Lo tengo yo'], ['oficina', 'Lo dejé en oficina'],
          ...(allowTeacher || value.resguardo === 'docente' ? [['docente', 'Lo dejé con un docente']] : [])]}
        onChange={(resguardo) => onChange({ ...value, resguardo, officeConfirmed: false })} />
      <FormHelp title="Cómo elegir la entrega">
        Si tienes el objeto, acordarás la entrega con su dueño. Si ya lo dejaste en oficina, indica dónde puede recogerlo.
      </FormHelp>
      {value.resguardo === 'docente' && <div className="field"><label htmlFor={`${prefix}-teacher`}>Nombre del docente</label><input id={`${prefix}-teacher`} className="input" maxLength={120} value={value.docente || ''} onChange={set('docente')} placeholder="Con quién quedó el objeto" /><p className="account-help">Es una referencia del resguardo acordado de palabra. Tú conservas la gestión del reclamo.</p></div>}
      {value.resguardo !== 'persona' && <div className="field"><label htmlFor={`${prefix}-location`}>Ubicación de resguardo <span className="account-optional">Opcional</span></label><input id={`${prefix}-location`} className="input" maxLength={200} value={value.ubicacionResguardo || ''} onChange={set('ubicacionResguardo')} placeholder={value.resguardo === 'oficina' ? 'Oficina de profesores · edificio I' : 'Ej. Salón I-12'} /></div>}
      {value.resguardo === 'oficina' && !officeLocked && <div className="notice notice--pend custody-confirmation">
        <p>Al guardarlo, el objeto permanecerá en oficina hasta su entrega. Después podrás precisar la ubicación.</p>
        <label className="check"><input type="checkbox" checked={!!value.officeConfirmed} onChange={(event) => onChange({ ...value, officeConfirmed: event.target.checked })} /><span>Confirmo que ya dejé el objeto en {value.ubicacionResguardo?.trim() || 'la mesa de la oficina de profesores del edificio I'}.</span></label>
      </div>}
      {officeLocked && <p className="account-help">El objeto permanece en oficina hasta su entrega. Puedes precisar la ubicación.</p>}
    </fieldset>
  )
}
export default function CustodyEditor({ item, onSaved, onCancel }) {
  const [value, setValue] = useState({ resguardo: item.resguardo || 'persona', docente: item.docente || '', ubicacionResguardo: item.ubicacionResguardo || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault(); if (saving) return
    if (value.resguardo === 'docente' && !value.docente.trim()) return setError('Escribe con qué docente quedó el objeto.')
    if (value.resguardo === 'oficina' && item.resguardo !== 'oficina' && !value.officeConfirmed) return setError('Confirma que ya dejaste el objeto en oficina.')
    setSaving(true); setError('')
    try { await cambiarResguardo(item.id, value); onSaved() }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
  return <form className="inline-form" onSubmit={save}>
    <CustodyFields value={value} onChange={setValue} disabled={saving} officeLocked={item.resguardo === 'oficina'} allowTeacher />
    {error && <p className="help help--error" role="alert">{error}</p>}
    <div className="btn-row"><button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>Cancelar resguardo</button><button className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar resguardo'}</button></div>
  </form>
}
