import { DOMINIO } from './constants.js'

export const PROFILE_FIELDS = [
  { name: 'nombre', label: 'Nombre completo', max: 120, autoComplete: 'name', required: true },
  { name: 'alias', label: 'Alias', max: 60, autoComplete: 'nickname', placeholder: '¿Cómo te gusta que te llamen?' },
  { name: 'carrera', label: 'Carrera o área', max: 160, required: true, placeholder: 'Tu carrera o programa académico' },
  { name: 'curso', label: 'Curso', max: 120, placeholder: 'Ej. 5.º cuatrimestre' },
  { name: 'grupo', label: 'Grupo', max: 80, placeholder: 'Ej. TI-51' },
  { name: 'salon', label: 'Salón', max: 80, placeholder: 'Ej. I-12' },
  { name: 'edificio', label: 'Edificio', max: 80, placeholder: 'Ej. I' },
]

export const profileForm = (user) => Object.fromEntries(PROFILE_FIELDS.map(({ name }) => [name, user?.[name] ?? '']))
export const normalizedProfile = (data) => Object.fromEntries(PROFILE_FIELDS.map(({ name }) => [name, data[name]?.trim() || null]))
export function profileError(data) {
  const clean = normalizedProfile(data)
  if (!clean.nombre || clean.nombre.length < 3) return 'Escribe un nombre de al menos 3 caracteres.'
  for (const { name, label, max, required } of PROFILE_FIELDS) {
    if (required && !clean[name]) return `Escribe tu ${label.toLocaleLowerCase('es-MX')}.`
    if ((clean[name]?.length ?? 0) > max) return `${label} admite hasta ${max} caracteres.`
    if (/[\u0000-\u001f\u007f-\u009f]/.test(clean[name] || '')) return `${label} debe escribirse en una sola línea.`
  }
  return ''
}

export function validEmail(email) {
  const normalized = email.trim().toLowerCase()
  return normalized.length <= 254 && /^[^@\s]+@[^@\s]+$/.test(normalized) ? normalized : ''
}

export function emailFromStudentNumber(number) {
  return /^[0-9]{10}$/.test(number) ? `a${number}${DOMINIO}` : ''
}

export function studentNumber(email, role) {
  return role === 'estudiante' ? /^a([0-9]{10})@utch\.edu\.mx$/.exec((email || '').trim().toLowerCase())?.[1] ?? null : null
}

export function profilePhotoError(file) {
  if (!file || !file.size) return 'Selecciona una imagen.'
  if (file.size > 5 * 1024 * 1024) return 'La foto debe pesar como máximo 5 MB.'
  if (file.type && !['image/jpeg', 'image/png'].includes(file.type)) return 'Usa una imagen JPG o PNG.'
  return ''
}
