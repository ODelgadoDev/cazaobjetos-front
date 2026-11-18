export default function ClaimProgress({ estado }) {
  const completed = estado === 'entregado'
  const stopped = ['rechazado', 'cancelado', 'cerrado'].includes(estado)
  const steps = stopped
    ? ['Solicitud', { rechazado: 'Rechazada', cancelado: 'Cancelada', cerrado: 'Cerrada por otra entrega' }[estado]]
    : ['Solicitud', 'Revisión y pruebas', 'Entrega', 'Finalizado']
  const current = stopped ? 1 : completed ? 3 : estado === 'aprobado' ? 2 : 1
  return <ol className="claim-steps" aria-label="Etapas del reclamo">
    {steps.map((label, index) => <li key={label} className={index <= current ? 'is-reached' : ''} aria-current={index === current ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}
  </ol>
}
