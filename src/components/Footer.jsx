import { Link } from 'react-router-dom'
import { footerLinks, siteInfo } from '../data/site.js'

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="mb-4 text-2xl font-medium text-white">{title}</h3>
      <ul className="space-y-1.5 leading-loose">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.path} className="transition-colors hover:text-gold">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="w-full bg-navy pt-16 text-white">
      <div className="container-x grid grid-cols-1 gap-6 pb-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <FooterColumn title="Quick links" links={footerLinks.quickLinks} />
        <FooterColumn title="Our Services" links={footerLinks.ourServices} />
        <FooterColumn title="Freight" links={footerLinks.freight} />

        <div>
          <h3 className="mb-4 text-2xl font-medium text-white">Quick Contact</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 font-semibold leading-relaxed">
              <img src="/brand/icon-location.png" alt="" width="26" height="26" className="shrink-0" />
              <span>{siteInfo.address}</span>
            </li>
            <li className="flex items-start gap-3 font-semibold leading-relaxed">
              <img src="/brand/icon-envelope.png" alt="" width="26" height="26" className="shrink-0" />
              <a href={`mailto:${siteInfo.email}`} className="break-all transition-colors hover:text-gold">
                {siteInfo.email}
              </a>
            </li>
            <li className="flex items-start gap-3 font-semibold leading-relaxed">
              <img src="/brand/icon-phone.png" alt="" width="26" height="26" className="shrink-0" />
              <span>{siteInfo.phones}</span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
