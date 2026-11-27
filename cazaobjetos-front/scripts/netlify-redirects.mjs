import { writeFile } from 'node:fs/promises'

const configuredOrigin = process.env.CAZA_API_ORIGIN?.trim()
if (!configuredOrigin) {
  throw new Error('Define CAZA_API_ORIGIN con el origen HTTPS de la API en Render.')
}

const api = new URL(configuredOrigin)
if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) {
  throw new Error('CAZA_API_ORIGIN debe ser un origen HTTPS sin credenciales, rutas ni parámetros.')
}

const redirects = [
  `/api/* ${api.origin}/api/:splat 200!`,
  '/* /index.html 200',
  '',
].join('\n')
await writeFile(new URL('../dist/_redirects', import.meta.url), redirects)
