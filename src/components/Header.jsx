import { useState } from 'react'
import { Link } from 'react-router-dom'
import { navMenu, siteInfo } from '../data/site.js'

// ─────────────────────────────────────────────────────────────────
// Site header — mirrors the original WordPress layout: pure white
// background with the logo centered at the top and a minimalist
// hamburger icon in a light border-rounded box directly below it.
// The hamburger opens the full menu (with expandable submenus) on
// every viewport, exactly like the original UI.
// ─────────────────────────────────────────────────────────────────
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null)

  const closeMenu = () => {
    setMenuOpen(false)
    setOpenSub(null)
  }

  return (
    <header className="w-full bg-white">
      {/* Logo — centered horizontally at the top of the header */}
      <div className="container-x flex flex-col items-center gap-4 py-5 sm:gap-5 sm:py-6">
        <Link to="/" onClick={closeMenu} className="shrink-0">
          <img
            src="/images/Logo-edited.png"
            alt={siteInfo.name}
            width="220"
            height="123"
            className="h-14 w-auto sm:h-[68px]"
          />
        </Link>

        {/* Hamburger — directly below the logo, inside a light border-rounded box */}
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-xl leading-none text-black transition-colors duration-200 hover:border-primary hover:text-primary"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Menu panel — always mounted so it animates open/closed on every viewport */}
      <nav
        id="site-menu"
        className={`overflow-hidden border-t border-[#E5E7EB] bg-white transition-[max-height] duration-300 ease-in-out ${
          menuOpen ? 'max-h-[calc(100vh-180px)] overflow-y-auto' : 'max-h-0 border-t-0'
        }`}
        aria-label="Main"
        aria-hidden={!menuOpen}
        inert={menuOpen ? undefined : true}
      >
        <ul className="mx-auto max-w-2xl px-5 pb-6 pt-1">
          {navMenu.map((item) => (
            <li key={item.label} className="border-b border-neutral-100 last:border-b-0">
              {item.children ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-3.5 text-left font-heading text-base font-medium text-black transition-colors hover:text-primary"
                    aria-expanded={openSub === item.label}
                    onClick={() => setOpenSub(openSub === item.label ? null : item.label)}
                  >
                    {item.label}
                    <span className="text-sm text-muted">{openSub === item.label ? '−' : '+'}</span>
                  </button>
                  {/* Submenu — accordion, same routes as before */}
                  <ul
                    className={`overflow-hidden transition-[max-height] duration-250 ease-in-out ${
                      openSub === item.label ? 'max-h-64' : 'max-h-0'
                    }`}
                  >
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link
                          to={child.path}
                          onClick={closeMenu}
                          className="block py-2.5 pl-5 text-[15px] text-muted transition-colors hover:text-primary"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={closeMenu}
                  className="block py-3.5 font-heading text-base font-medium text-black transition-colors hover:text-primary"
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
