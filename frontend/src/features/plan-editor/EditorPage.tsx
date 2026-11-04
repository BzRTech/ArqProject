import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { registerWebFonts } from '@/render/pdf/fonts'
import { AreasPanel } from './AreasPanel'
import { CatalogPanel } from './CatalogPanel'
import { SheetPreview } from './SheetPreview'
import { SheetsPanel } from './SheetsPanel'
import { StageTabs } from './StageTabs'
import { useEditor } from './store'
import { EditorActions } from './EditorActions'
import { EnvTabs } from './EnvTabs'
import { usePersistence, type ProjectSource } from './hooks'
import { ConflictBanner } from './ConflictBanner'
import { LibraryUpdatesBanner } from '@/features/library/LibraryUpdatesBanner'
import { useEditorLibrary } from '@/features/library/use-editor-library'
import { useLoadSheetBrand } from '@/features/brand/sheet-brand'
import { PlanCanvas } from './PlanCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { StageTitle } from './StageTitle'
import { Toolbar } from './Toolbar'
import { ViewOptions } from './ViewOptions'
import { PdfPlanImportDialog } from './PdfPlanImportDialog'

const LOCAL: ProjectSource = { kind: 'local' }
const ThreePanel = lazy(() => import('./ThreePanel'))

/** Editor. `source` = rascunho local (/editor) ou projeto do servidor (/projetos/:id). */
export default function EditorPage({ source = LOCAL }: { source?: ProjectSource }) {
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view')
  useEffect(() => {
    if (view === '3d') useEditor.getState().setStage('3d')
  }, [view])
  const persistence = usePersistence(source)
  useEditorLibrary(source)
  useLoadSheetBrand(source.kind === 'server')
  const { status } = persistence
  const stage = useEditor((s) => s.stage)
  const detailOpen = useEditor((s) => s.detailItemId !== null)
  const [fitSignal, setFitSignal] = useState(0)
  const [tabletPanel, setTabletPanel] = useState<'catalog' | 'properties' | null>(null)
  const fit = () => setFitSignal((n) => n + 1)
  useEffect(() => {
    // Mesma fonte da prancha também na tela.
    registerWebFonts().catch(() => undefined)
  }, [])
  if (persistence.loadError)
    return (
      <section className="load-error" data-testid="load-error">
        <div className="eyebrow">Projeto</div>
        <h1>Não foi possível abrir o projeto.</h1>
        <p>{persistence.loadError}</p>
        <Link to="/projetos" className="button">
          Voltar aos projetos
        </Link>
      </section>
    )
  if (status === 'carregando') return <p className="loading">Carregando projeto…</p>
  return (
    <section className="editor">
      <PdfPlanImportDialog />
      <EditorActions persistence={persistence} onFit={fit} />
      <ConflictBanner persistence={persistence} />
      {source.kind === 'server' && <LibraryUpdatesBanner />}
      <header className="editor__bar">
        <EnvTabs />
      </header>
      <StageTabs />
      {stage !== '3d' && (
        <div className="tablet-panel-controls">
          <button
            type="button"
            aria-expanded={tabletPanel === 'catalog'}
            onClick={() => setTabletPanel(tabletPanel === 'catalog' ? null : 'catalog')}
            data-testid="tablet-catalog"
          >
            {stage === 'pranchas' ? 'Pranchas' : stage === 'piso' ? 'Pisos' : 'Catálogo'}
          </button>
          <button
            type="button"
            aria-expanded={tabletPanel === 'properties'}
            onClick={() => setTabletPanel(tabletPanel === 'properties' ? null : 'properties')}
            data-testid="tablet-properties"
          >
            Propriedades
          </button>
          <span>Pinça para zoom · dois dedos para mover</span>
        </div>
      )}
      {stage === '3d' ? (
        <Suspense fallback={<p className="loading">Carregando vista 3D…</p>}>
          <ThreePanel />
        </Suspense>
      ) : (
        <div
          className={`editor__body ${tabletPanel ? `tablet-${tabletPanel}-open` : ''}`}
          onClickCapture={(e) => {
            if ((e.target as Element).closest('[data-testid^="block-"], [data-testid^="opening-"]'))
              setTabletPanel(null)
          }}
        >
          {tabletPanel && (
            <button
              type="button"
              className="tablet-panel-backdrop"
              aria-label="Fechar painel"
              onClick={() => setTabletPanel(null)}
            />
          )}
          {stage === 'piso' ? (
            <AreasPanel />
          ) : stage === 'pranchas' ? (
            <SheetsPanel />
          ) : (
            <CatalogPanel />
          )}
          {stage === 'pranchas' || (stage === 'marcenaria' && detailOpen) ? (
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
      )}
    </section>
  )
}
