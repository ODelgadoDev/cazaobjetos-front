import { request } from './realApi.js'

const API = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const path = (reportId) => `/lost-reports/${encodeURIComponent(reportId)}/responses`
const detail = (reportId, id) => `${path(reportId)}/${encodeURIComponent(id)}`

export const getLostResponses = (reportId, signal) => request('GET', path(reportId), undefined, undefined, { signal })

export function createLostResponse(reportId, { location, body, image, custody = 'WITH_FINDER', custodyLocation }, key) {
  const form = new FormData()
  form.append('request', new Blob([JSON.stringify({
    location,
    body,
    photoUrl: image?.url || null,
    custody,
    custodyLocation: custody === 'OFFICE' ? custodyLocation : null,
  })], { type: 'application/json' }))
  if (image?.file) form.append('file', image.file)
  return request('POST', path(reportId), form, key)
}

export const lostResponsePhoto = (response) => {
  if (response.photoType === 'UPLOAD') return `${API}${detail(response.lostReportId, response.id)}/photo`
  return null
}
export const updateLostResponseCustody = (reportId, id, custody, location) =>
  request('PUT', `${detail(reportId, id)}/custody`, { custody, location: custody === 'OFFICE' ? location : null })
export const completeLostResponse = (reportId, id) => request('POST', `${detail(reportId, id)}/complete`)
export const cancelLostResponse = (reportId, id) => request('POST', `${detail(reportId, id)}/cancel`)
export const getLostResponseComments = (reportId, id, signal) =>
  request('GET', `${detail(reportId, id)}/comments`, undefined, undefined, { signal })
export const postLostResponseComment = (reportId, id, body, key) =>
  request('POST', `${detail(reportId, id)}/comments`, { body }, key)
