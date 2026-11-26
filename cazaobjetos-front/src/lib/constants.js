export const CATEGORIAS = ['Electrónica', 'Documentos', 'Llaves', 'Ropa/Mochilas', 'Otro']
export const CASETAS = ['Oficina de profesores · mesa de objetos perdidos · edificio I']
export const UBICACIONES = ['Edificio I', 'Salón', 'Laboratorio', 'Oficina de profesores', 'Biblioteca', 'Cafetería', 'Canchas', 'Estacionamiento', 'Gimnasio']

// Estados del reclamo: igual al diagrama de estados del back
// Enviado -> EnRevision <-> RequierePruebas ; EnRevision -> Aprobado | Rechazado ; Aprobado -> Entregado | Cancelado
export const ESTADOS_RECLAMO = {
  enviado: { label: 'Pendiente de revisión', chip: 'info', etapa: 1 },
  en_revision: { label: 'En revisión', chip: 'info', etapa: 2 },
  requiere_pruebas: { label: 'Requiere pruebas', chip: 'pend', etapa: 2 },
  aprobado: { label: 'Aceptado · falta entregar', chip: 'ok', etapa: 3 },
  rechazado: { label: 'Rechazado', chip: 'peligro', etapa: 2 },
  entregado: { label: 'Entregado', chip: 'cat', etapa: 4 },
  cerrado: { label: 'Cerrado · otro reclamo completado', chip: 'cat', etapa: 4 },
  cancelado: { label: 'Cancelado', chip: 'cat', etapa: 1 },
}
export const ESTADOS_ACTIVOS = ['enviado', 'en_revision', 'requiere_pruebas', 'aprobado']
export const ESTADOS_CERRADOS = ['entregado', 'cancelado', 'rechazado', 'cerrado']

// Estado del hallazgo (publicación + resguardo)
export const ESTADOS_HALLAZGO = {
  retirado: { label: 'Retirado', chip: 'cat' },
  bajo_custodia: { label: 'Bajo custodia', chip: 'ok' },
  con_finder: { label: 'Con quien lo encontró', chip: 'info' },
  en_revision: { label: 'Reclamo en revisión', chip: 'pend' },
  entregado: { label: 'Entregado', chip: 'cat' },
}

export const ETAPAS = ['Enviado', 'Revisión', 'Aprobado', 'Entregado']

// Estado del reporte de extravío
export const ESTADOS_EXTRAVIO = {
  retirado: { label: 'Retirado', chip: 'cat' },
  activo: { label: 'Se busca', chip: 'pend' },
  recuperado: { label: 'Recuperado', chip: 'ok' },
}

export const ROLES = {
  estudiante: 'Estudiante',
  docente: 'Docente',
  secretaria: 'Secretaría',
  vigilancia: 'Vigilancia',
  administrador: 'Administrador',
}

export const DOMINIO = '@utch.edu.mx'
export const MIN_PASSWORD = 12
