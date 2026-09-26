import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { navMenu, siteInfo } from '../data/site.js'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <header className="site-header">
      <div className={`container header-inner${isHome ? ' stacked' : ''}`}>
        <Link to="/" className="logo-link" onClick={() => setMobileOpen(false)}>
          <img src="/images/Logo-edited.png" alt={siteInfo.name} width="132" height="74" />
        </Link>

        {/* Desktop nav */}
        <nav className="main-nav" aria-label="Main">
          <ul>
            {navMenu.map((item) => (
              <li key={item.label} className={item.children ? 'has-sub' : ''}>
                <NavLink to={item.path} end={item.path === '/'}>
                  {item.label}
                  {item.children && <span className="sub-arrow">▾</span>}
                </NavLink>
                {item.children && (
                  <ul className="submenu">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link to={child.path}>{child.label}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile toggle */}
        <button
          className="nav-toggle"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Mobile">
          <ul>
            {navMenu.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <>
                    <button
                      className="mobile-sub-toggle"
                      onClick={() => setOpenSub(openSub === item.label ? null : item.label)}
                    >
                      {item.label} <span>{openSub === item.label ? '−' : '+'}</span>
                    </button>
                    {openSub === item.label && (
                      <ul className="mobile-submenu">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <Link to={child.path} onClick={() => setMobileOpen(false)}>
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link to={item.path} onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
