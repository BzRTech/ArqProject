import { Link } from 'react-router'
import { useHealth } from '@/api/health'

export default function HomePage() {
  const health = useHealth()
  const state = health.isPending ? 'pending' : health.isError ? 'error' : 'ok'

  return (
    <section className="home">
      <h1>Prancheta</h1>
      <p>
        Fase 1: núcleo de geometria (unidades, primitivas, cotas, hachuras) com saída em tela e PDF.
      </p>

      <div className={`health health--${state}`} data-testid="health">
        <strong>API:</strong> {health.isPending && 'verificando…'}
        {health.isError && 'indisponível (o backend está rodando?)'}
        {health.data && `${health.data.status} · banco ${health.data.database}`}
      </div>

      <ul className="cards">
        <li>
          <Link to="/dev/primitivas">
            <strong>Catálogo de primitivas</strong>
            <span>Prancha A3 com planta 1:50, vista 1:20, cotas em cadeia — na tela e em PDF.</span>
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
