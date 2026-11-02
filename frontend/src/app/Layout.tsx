import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { TopbarSlotContext } from './topbar-slot'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/editor', label: 'Editor' },
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
      </header>
      <main className="content">
        <TopbarSlotContext.Provider value={slot}>
          <Outlet />
        </TopbarSlotContext.Provider>
      </main>
    </div>
  )
}
