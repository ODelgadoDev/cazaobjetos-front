import { MIN_PASSWORD } from './constants.js'

export const PASSWORD_REQUIREMENTS = `Mínimo ${MIN_PASSWORD} caracteres, 1 número y 1 símbolo.`

export function passwordError(value) {
  if ([...value].length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
  if (!/\p{Nd}/u.test(value) || !/[\p{P}\p{S}]/u.test(value)) {
    return 'La contraseña debe incluir al menos un número y un símbolo.'
  }
  if (new TextEncoder().encode(value).length > 72) return 'La contraseña admite hasta 72 bytes UTF-8.'
  return ''
}
