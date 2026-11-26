const steps = ['Enviada', 'Revisión', 'Entrega', 'Entregado']

function currentStep(status) {
  if (status === 'entregado') return 4
  if (status === 'aprobado') return 3
  if (['enviado', 'en_revision', 'requiere_pruebas'].includes(status)) return 2
  return null
}

export function nextClaimStep(status, claimant) {
  if (status === 'enviado' || status === 'en_revision') {
    return claimant ? 'Espera a que quien lo encontró revise tu solicitud.' : 'Revisa los detalles y acepta o rechaza la solicitud.'
  }
  if (status === 'requiere_pruebas') return claimant ? 'Envía la información solicitada.' : 'Espera la respuesta de quien hizo la solicitud.'
  if (status === 'aprobado') {
    return claimant ? 'Cuando tengas el objeto, confirma que lo recibiste.' : 'La entrega se cierra cuando la otra persona confirma que lo recibió.'
  }
  return ''
}

export default function ClaimProgress({ status }) {
  const active = currentStep(status)
  return (
    <ol className="claim-progress" aria-label="Progreso de la solicitud">
      {steps.map((step, index) => {
        const number = index + 1
        const done = number < (active ?? 2) || status === 'entregado'
        return (
          <li key={step} className={done ? 'is-done' : number === active ? 'is-current' : undefined}
            aria-current={number === active ? 'step' : undefined}>
            <span className="claim-progress__number" aria-hidden="true">{number}</span><span>{step}</span>
          </li>
        )
      })}
    </ol>
  )
}
