import { useEffect, useState } from 'react'
import { registerWebFonts } from '@/render/pdf/fonts'
import { AreasPanel } from './AreasPanel'
import { CatalogPanel } from './CatalogPanel'
import { SheetPreview } from './SheetPreview'
import { SheetsPanel } from './SheetsPanel'
import { StageTabs } from './StageTabs'
import { useEditor } from './store'
import { EditorActions } from './EditorActions'
import { EnvTabs } from './EnvTabs'
import { useLocalPersistence } from './hooks'
import { PlanCanvas } from './PlanCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { StageTitle } from './StageTitle'
import { Toolbar } from './Toolbar'
import { ViewOptions } from './ViewOptions'

export default function EditorPage() {
  const status = useLocalPersistence()
  const stage = useEditor((s) => s.stage)
  const [fitSignal, setFitSignal] = useState(0)
  const fit = () => setFitSignal((n) => n + 1)
  useEffect(() => {
    // Mesma fonte da prancha também na tela.
    registerWebFonts().catch(() => undefined)
  }, [])
  if (status === 'carregando') return <p className="loading">Carregando projeto…</p>
  return (
    <section className="editor">
      <EditorActions status={status} onFit={fit} />
      <header className="editor__bar">
        <EnvTabs />
      </header>
      <StageTabs />
      <div className="editor__body">
        {stage === 'piso' ? (
          <AreasPanel />
        ) : stage === 'pranchas' ? (
          <SheetsPanel />
        ) : (
          <CatalogPanel />
        )}
        {stage === 'pranchas' ? (
          <div className="stage">
            <SheetPreview />
          </div>
        ) : (
          <div className="stage">
            <PlanCanvas fitSignal={fitSignal} />
            <StageTitle />
            <ViewOptions />
            <Toolbar onFit={fit} />
          </div>
        )}
        <PropertiesPanel />
      </div>
    </section>
  )
}
