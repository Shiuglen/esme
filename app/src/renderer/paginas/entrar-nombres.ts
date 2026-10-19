// Los agentes dicen sus métodos de entrada en inglés («Sign in with ChatGPT Subscription»): en Esme se dicen en español.
export function nombreDeMetodo(n: string): string {
  return n.trim()
    .replace(/^(?:sign|log) ?in with (.+?) subscription$/i, 'Entrar con tu suscripción de $1')
    .replace(/^(?:sign|log) ?in with /i, 'Entrar con ')
    .replace(/^use (.+?) api key$/i, 'Con tu clave de $1')
}
