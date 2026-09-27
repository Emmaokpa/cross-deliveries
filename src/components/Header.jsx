import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { navMenu, siteInfo } from '../data/site.js'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null)

  const closeMenu = () => {
    setMobileOpen(false)
    setOpenSub(null)
  }

  return (
    <header className="w-full bg-white">
      <div className="container-x flex min-h-20 items-center justify-between max-lg:min-h-[72px] max-lg:px-4">
        <Link to="/" className="shrink-0" onClick={closeMenu}>
          <img
            src="/images/Logo-edited.png"
            alt={siteInfo.name}
            width="132"
            height="74"
            className="h-auto max-lg:h-11 max-lg:w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:block" aria-label="Main">
          <ul className="flex items-center gap-1">
            {navMenu.map((item) => (
              <li key={item.label} className="group relative">
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className="block px-3.5 py-2.5 font-heading text-[15px] font-medium text-black transition-colors duration-200 hover:text-primary lg:text-base"
                >
                  {item.label}
                  {item.children && <span className="ml-1 text-[10px]">▾</span>}
                </NavLink>
                {item.children && (
                  <ul className="invisible absolute left-0 top-full z-50 min-w-60 translate-y-2 bg-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-250 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link
                          to={child.path}
                          className="block border-b border-neutral-100 px-4 py-2.5 font-heading text-[15px] font-medium text-black transition-colors hover:text-primary"
                        >
                          {child.label}
                        </Link>
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
          className="flex size-11 items-center justify-center text-2xl leading-none text-black lg:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu — always mounted so it animates open/closed */}
      <nav
        className={`overflow-hidden border-t border-neutral-100 bg-white transition-[max-height] duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'max-h-[calc(100vh-72px)] overflow-y-auto' : 'max-h-0 border-t-0'
        }`}
        aria-label="Mobile"
        aria-hidden={!mobileOpen}
        inert={mobileOpen ? undefined : true}
      >
        <ul className="px-5 pb-5 pt-2.5">
          {navMenu.map((item) => (
            <li key={item.label}>
              {item.children ? (
                <>
                  <button
                    className="flex w-full items-center justify-between border-b border-neutral-100 py-3 text-left text-base text-black"
                    onClick={() => setOpenSub(openSub === item.label ? null : item.label)}
                  >
                    {item.label}
                    <span>{openSub === item.label ? '−' : '+'}</span>
                  </button>
                  {openSub === item.label && (
                    <ul>
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            to={child.path}
                            onClick={closeMenu}
                            className="block border-b border-neutral-100 py-3 pl-5 text-[15px] text-muted"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={closeMenu}
                  className="block border-b border-neutral-100 py-3 text-base text-black"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
