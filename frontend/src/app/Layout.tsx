import { NavLink, Outlet } from 'react-router'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/editor', label: 'Editor' },
  { to: '/dev/primitivas', label: 'Primitivas' },
  { to: '/spikes/3d', label: '3D (spike)' },
]

export default function Layout() {
  return (
    <div className="shell">
      <nav className="topbar">
        <span className="brand">
          <img src="/favicon.svg" alt="" width={22} height={22} /> Prancheta
        </span>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
