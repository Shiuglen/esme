// Las vistas previas (Memoria, lanzador, listas) enseñan texto, no Markdown crudo: sin «##», «**», viñetas ni enlaces
// sin dibujar, y sin la fecha ISO que algunos recuerdos repiten al principio (la fecha ya se ve aparte).
export function sinMarkdown(t: string): string {
  return t
    .replace(/```[\s\S]*?```/g, ' [código] ')
    .replace(/^\s*\d{4}-\d{2}-\d{2}\s*[—–-]\s*/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split('\n').map((l) => l.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/^\s*(?:[-*+]|>)\s+/, '').trim()).filter(Boolean).join(' · ')
    .replace(/(\*\*|__|\*|_|~~|`)(?=\S)([^*_~`]*?\S)\1/g, '$2')
    .replace(/\s+[-*+]\s+(?=\S)/g, ' ')
    .replace(/\s{2,}/g, ' ').replace(/ · \[código\] · /g, ' [código] ').trim()
}
