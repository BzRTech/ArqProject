import { Link } from 'react-router'
import { useHealth } from '@/api/health'

export default function HomePage() {
  const health = useHealth()
  const state = health.isPending ? 'pending' : health.isError ? 'error' : 'ok'

  return (
    <section className="home">
      <h1>Prancheta — Fase 0</h1>
      <p>Fundação do monorepo: API Django, front React e os três spikes técnicos.</p>

      <div className={`health health--${state}`} data-testid="health">
        <strong>API:</strong> {health.isPending && 'verificando…'}
        {health.isError && 'indisponível (o backend está rodando?)'}
        {health.data && `${health.data.status} · banco ${health.data.database}`}
      </div>

      <ul className="cards">
        <li>
          <Link to="/spikes/svg">
            <strong>SVG com pan/zoom</strong>
            <span>2 000 linhas, zoom no cursor, contador de fps.</span>
          </Link>
        </li>
        <li>
          <Link to="/spikes/pdf">
            <strong>PDF vetorial A3 1:50</strong>
            <span>Parede de 4 m cotada, fonte embutida, escala conferível.</span>
          </Link>
        </li>
        <li>
          <Link to="/spikes/3d">
            <strong>three.js</strong>
            <span>10 caixas com texturas de MDF geradas no app.</span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
