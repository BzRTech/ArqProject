import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { TopbarSlotContext } from './topbar-slot'
import { UserMenu } from './UserMenu'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/projetos', label: 'Projetos' },
  { to: '/banco', label: 'Banco' },
  { to: '/editor', label: 'Rascunho local' },
  { to: '/dev/primitivas', label: 'Primitivas' },
  { to: '/spikes/3d', label: '3D', tag: 'beta' },
]

export default function Layout() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Prancheta</span>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
              {l.tag && <span className="tag">{l.tag}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="topbar__actions" ref={setSlot} />
        <UserMenu />
      </header>
      <main className="content">
        <TopbarSlotContext.Provider value={slot}>
          <Outlet />
        </TopbarSlotContext.Provider>
      </main>
    </div>
  )
}
