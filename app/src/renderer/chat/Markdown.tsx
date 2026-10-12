// Markdown de las respuestas con el estilo de Esme. Sin HTML crudo: lo que diga la IA nunca inyecta marcado.
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const c: Components = {
  p: (p) => <p className="my-2 first:mt-0 last:mb-0" {...p} />,
  strong: (p) => <strong className="font-semibold text-texto" {...p} />,
  em: (p) => <em className="italic" {...p} />,
  a: ({ href, ...p }) => <a href={href} target="_blank" rel="noreferrer" className="text-acento underline decoration-acento/40 underline-offset-2 hover:decoration-acento" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-texto-3" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-texto-3" {...p} />,
  h1: (p) => <h3 className="mt-4 mb-2 font-display text-lg font-semibold tracking-[-0.01em]" {...p} />,
  h2: (p) => <h3 className="mt-4 mb-2 font-display text-base font-semibold" {...p} />,
  h3: (p) => <h4 className="mt-3 mb-1.5 text-[15px] font-semibold" {...p} />,
  blockquote: (p) => <blockquote className="my-2 border-l-2 border-linea-fuerte pl-3 text-texto-2" {...p} />,
  code: ({ className, children, ...p }) => /language-/.test(className ?? '')
    ? <code className={`${className} font-mono text-[13px]`} {...p}>{children}</code>
    : <code className="rounded-1 bg-s2 px-1.5 py-0.5 font-mono text-[13px] text-texto" {...p}>{children}</code>,
  pre: (p) => <pre className="my-3 overflow-x-auto rounded-3 border border-linea bg-s1 p-3.5 leading-6" {...p} />,
  table: (p) => <div className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm" {...p} /></div>,
  th: (p) => <th className="border-b border-linea-fuerte px-2 py-1.5 text-left font-semibold" {...p} />,
  td: (p) => <td className="border-b border-linea px-2 py-1.5" {...p} />,
  hr: () => <hr className="my-4 border-linea" />,
}

export function Markdown({ texto }: { texto: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={c} skipHtml>{texto}</ReactMarkdown>
}
