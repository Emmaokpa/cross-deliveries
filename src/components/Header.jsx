import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { navMenu, siteInfo } from '../data/site.js'

// ─────────────────────────────────────────────────────────────────
// Site header — mirrors the original WordPress layout: pure white
// background with the logo centered at the top and a minimalist
// hamburger icon in a light border-rounded box directly below it.
// The hamburger glides open an off-canvas drawer from the right with
// a dark translucent (blurred) backdrop behind it, exactly like the
// original UI. Closes via the X button, clicking outside, Escape or
// navigating to any link.
// ─────────────────────────────────────────────────────────────────
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null)

  const closeMenu = () => {
    setMenuOpen(false)
    setOpenSub(null)
  }

  // Escape closes the drawer; body scroll is locked while it's open
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [menuOpen])

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
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
      </div>

      {/* Backdrop — dark translucent + blur; click anywhere to close */}
      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Off-canvas drawer — glides smoothly in from the right */}
      <nav
        id="site-menu"
        aria-label="Main"
        aria-hidden={!menuOpen}
        inert={menuOpen ? undefined : true}
        className={`fixed right-0 top-0 z-50 flex h-full w-80 max-w-[86vw] flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer head — logo + clear close (X) button */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <img src="/images/Logo-edited.png" alt="" width="150" height="84" className="h-9 w-auto" />
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="flex size-10 items-center justify-center rounded-md border border-[#E5E7EB] text-lg leading-none text-black transition-colors hover:border-primary hover:text-primary"
          >
            ✕
          </button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
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
                    className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
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
