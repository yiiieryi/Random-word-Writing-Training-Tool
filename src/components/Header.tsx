import { NavLink } from 'react-router-dom'
import Logo from './Logo'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <NavLink to="/" className="group flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-lg tracking-[0.12em] text-ink">词雾</span>
          <span className="hidden text-xs text-muted sm:inline">灵感，从两个词开始</span>
        </NavLink>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/write"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            写作台
          </NavLink>
          <NavLink
            to="/word-library"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            词组管理
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            系统设置
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
