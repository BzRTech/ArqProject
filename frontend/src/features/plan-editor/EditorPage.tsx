import { useEffect, useState } from 'react'
import { registerWebFonts } from '@/render/pdf/fonts'
import { CatalogPanel } from './CatalogPanel'
import { useLocalPersistence } from './hooks'
import { PlanCanvas } from './PlanCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { EnvTabs, Toolbar } from './Toolbar'

const STATUS_LABEL = {
  carregando: 'Carregando…',
  salvo: 'Salvo neste navegador',
  salvando: 'Salvando…',
  erro: 'Erro ao salvar',
}

export default function EditorPage() {
  const status = useLocalPersistence()
  const [fitSignal, setFitSignal] = useState(0)
  useEffect(() => {
    // Mesma fonte da prancha também na tela.
    registerWebFonts().catch(() => undefined)
  }, [])
  if (status === 'carregando') return <p className="loading">Carregando projeto…</p>
  return (
    <section className="editor">
      <header className="editor__top">
        <EnvTabs />
        <span className={`save-status save-status--${status}`} data-testid="save-status">
          {STATUS_LABEL[status]}
        </span>
      </header>
      <Toolbar onFit={() => setFitSignal((n) => n + 1)} />
      <div className="editor__body">
        <CatalogPanel />
        <PlanCanvas fitSignal={fitSignal} />
        <PropertiesPanel />
      </div>
    </section>
  )
}
