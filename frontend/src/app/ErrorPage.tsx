import { Download, RotateCw } from 'lucide-react'
import { useRouteError } from 'react-router'

/** Baixa o projeto salvo no navegador (.json), para nada se perder mesmo com a tela quebrada. */
async function downloadSavedProject() {
  const { loadProject } = await import('@/features/plan-editor/persistence')
  const project = await loadProject()
  if (!project) {
    window.alert('Não há projeto salvo neste navegador.')
    return
  }
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${project.name || 'projeto'}.prancheta.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Página de erro de todas as rotas: explica, oferece recarregar e baixar uma cópia do projeto. */
export default function ErrorPage() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  return (
    <section className="error-page" data-testid="error-page">
      <div className="eyebrow">Erro inesperado</div>
      <h1>Algo deu errado nesta tela.</h1>
      <p>
        O projeto continua salvo neste navegador. Recarregue a página; se o erro voltar, baixe uma
        cópia do projeto e envie junto com a mensagem abaixo.
      </p>
      <div className="button-row">
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          <RotateCw size={15} strokeWidth={1.5} />
          Recarregar
        </button>
        <button type="button" onClick={() => void downloadSavedProject()}>
          <Download size={15} strokeWidth={1.5} />
          Baixar cópia do projeto (.json)
        </button>
      </div>
      <details>
        <summary>Detalhes técnicos</summary>
        <pre>{stack ?? message}</pre>
      </details>
    </section>
  )
}
