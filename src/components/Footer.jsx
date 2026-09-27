import { Link } from 'react-router-dom'
import { footerLinks, siteInfo } from '../data/site.js'

function FooterColumn({ title, links }) {
  return (
    <div className="footer-col">
      <h3>{title}</h3>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.path}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <FooterColumn title="Quick links" links={footerLinks.quickLinks} />
        <FooterColumn title="Our Services" links={footerLinks.ourServices} />
        <FooterColumn title="Freight" links={footerLinks.freight} />

        <div className="footer-col">
          <h3>Quick Contact</h3>
          <ul className="footer-contact">
            <li>
              <img src="/brand/icon-location.png" alt="" width="26" height="26" />
              <span>{siteInfo.address}</span>
            </li>
            <li>
              <img src="/brand/icon-envelope.png" alt="" width="26" height="26" />
              <a href={`mailto:${siteInfo.email}`}>{siteInfo.email}</a>
            </li>
            <li>
              <img src="/brand/icon-phone.png" alt="" width="26" height="26" />
              <span>{siteInfo.phones}</span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
