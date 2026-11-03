export function newId(): string {
  // randomUUID esiste solo in contesti sicuri (https/localhost): dal telefono
  // in rete locale via http serve un'alternativa.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
