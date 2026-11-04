import { Link } from 'react-router'
import { useHealth } from '@/api/health'

const CARDS = [
  {
    to: '/projetos',
    num: 'I.',
    title: 'Projetos',
    text: 'Projetos do escritório salvos no servidor, com histórico de versões. Planta, layout, piso, marcenaria e pranchas em PDF.',
    testId: 'open-projects',
  },
  {
    to: '/editor',
    num: 'II.',
    title: 'Rascunho local',
    text: 'O mesmo editor sem conta: salva só neste navegador. Depois dá para enviar o rascunho para os projetos.',
    testId: 'open-editor',
  },
  {
    to: '/dev/primitivas',
    num: 'III.',
    title: 'Primitivas',
    text: 'Prancha A3 com planta 1:50, vista 1:20 e cotas em cadeia, na tela e em PDF.',
  },
  {
    to: '/editor?view=3d',
    num: 'IV.',
    title: 'Vista 3D',
    text: 'Explore o rascunho em perspectiva, abra os móveis detalhados e capture imagens para apresentação.',
  },
]

export default function HomePage() {
  const health = useHealth()
  const state = health.isPending ? 'pending' : health.isError ? 'error' : 'ok'

  return (
    <section className="home">
      <header className="home__hero">
        <div>
          <div className="eyebrow">Projetos de interiores</div>
          <h1>Prancheta</h1>
        </div>
        <div>
          <p className="home__lead">
            Planta baixa sobre a planta importada, itens com marcadores e legenda, orçamento e
            pranchas em PDF, tudo desenhado no próprio sistema.
          </p>
          <div className={`health health--${state}`} data-testid="health">
            API: {health.isPending && 'verificando…'}
            {health.isError && 'indisponível (o backend está rodando?)'}
            {health.data && `${health.data.status} · banco ${health.data.database}`}
          </div>
        </div>
      </header>

      <ul className="cards">
        {CARDS.map((c) => (
          <li key={c.to}>
            <Link to={c.to} data-testid={c.testId}>
              <span className="num">{c.num}</span>
              <strong>{c.title}</strong>
              <span>{c.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
