const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const p = (n) => String(n).padStart(2, '0')

export function fechaCorta(iso) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const d = new Date(dateOnly ? `${iso}T12:00:00` : iso)
  return `${p(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}${dateOnly ? '' : ` · ${p(d.getHours())}:${p(d.getMinutes())}`}`
}
export const hoyISO = () => `${new Date().getFullYear()}-${p(new Date().getMonth() + 1)}-${p(new Date().getDate())}`
export const ahoraHora = () => new Date().toTimeString().slice(0, 5)
