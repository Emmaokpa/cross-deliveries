import PageHero from '../components/PageHero.jsx'
import TrackForm from '../components/TrackForm.jsx'
import { pages } from '../data/site.js'

function Starburst({ className }) {
  return (
    <svg
      className={`starburst ${className || ''}`}
      viewBox="0 0 40 40"
      width="34"
      height="34"
      aria-hidden="true"
    >
      <g fill="none" strokeWidth="2.4" strokeLinecap="round">
        <path d="M20 2 L20 12" stroke="#e30613" />
        <path d="M20 28 L20 38" stroke="#031435" />
        <path d="M2 20 L12 20" stroke="#031435" />
        <path d="M28 20 L38 20" stroke="#e30613" />
        <path d="M7.3 7.3 L14.4 14.4" stroke="#e30613" />
        <path d="M25.6 25.6 L32.7 32.7" stroke="#031435" />
        <path d="M7.3 32.7 L14.4 25.6" stroke="#031435" />
        <path d="M25.6 14.4 L32.7 7.3" stroke="#e30613" />
      </g>
      <circle cx="20" cy="20" r="4" fill="#e30613" />
    </svg>
  )
}

function FaqAccordion({ items }) {
  return (
    <div className="faq-accordion">
      {items.map((item) => (
        <details key={item.q} open>
          <summary>
            {item.q}
            <span className="faq-chevron">▾</span>
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}

export default function ServicePage({ pageKey }) {
  const page = pages[pageKey]
  if (!page) return null

  const paragraphs = (text) =>
    text.split('\n').map((t) => <p key={t.slice(0, 24)}>{t}</p>)

  return (
    <>
      <PageHero title={page.title} image={page.heroImage} />

      {/* CONSULTATION layout */}
      {pageKey === 'consultation' && (
        <section className="section-sm">
          <div className="container about-grid">
            <div className="about-media">
              <img src={page.intro.image} alt={page.intro.heading} />
            </div>
            <div className="about-copy">
              <h2>{page.intro.heading}</h2>
              {page.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              <p className="subheading">
                <strong>{page.intro.subheading}</strong>
              </p>
              <p>{page.intro.subParagraph}</p>
            </div>
          </div>
        </section>
      )}

      {/* INTERNATIONAL layout */}
      {pageKey === 'international' && (
        <>
          <section className="section-sm">
            <div className="container">
              <h2 className="big-title">{page.sectionTitle}</h2>
              {paragraphs(page.sectionText)}
              <div className="feature-row">
                {page.features.map((f) => (
                  <div key={f.title} className="feature-box">
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="intl-banner" style={{ backgroundImage: `url(${page.banner.image})` }}>
            <div className="intl-banner-overlay" />
            <div className="container intl-banner-inner">
              <h3>{page.banner.title}</h3>
              <p>{page.banner.text}</p>
            </div>
          </section>
          <section className="section-sm">
            <div className="container">
              <div className="feature-row">
                {page.cards.map((c) => (
                  <div key={c.title} className="feature-box boxed">
                    <h3>{c.title}</h3>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* DOMESTIC layout */}
      {pageKey === 'domestic' && (
        <>
          <section className="section-sm domestic-intro">
            <div className="container text-center">
              <h2>{page.sectionTitle}</h2>
              <p>{page.sectionText}</p>
            </div>
          </section>
          <section className="section-sm">
            <div className="container about-grid">
              <div className="about-media">
                <img src={page.image} alt={page.accordionTitle} style={{ borderRadius: 19 }} />
              </div>
              <div>
                <h2>{page.accordionTitle}</h2>
                <FaqAccordion items={page.faqs} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* AIR layout */}
      {pageKey === 'air' && (
        <>
          {/* WP Cargo tracking band under the banner */}
          <section className="track-band air-track-band" style={{ backgroundImage: 'url(/images/track.webp)' }}>
            <div className="track-band-overlay" />
            <div className="container track-band-inner">
              <TrackForm />
            </div>
          </section>
          <section className="section-sm">
            <div className="container about-grid">
              <div className="about-media">
                <img src={page.intro.image} alt={page.intro.heading} style={{ borderRadius: 19 }} />
              </div>
              <div className="about-copy">
                <h2>{page.intro.heading}</h2>
                {page.intro.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </div>
          </section>
          <section className="section-sm services-white">
            <div className="container">
              <div className="section-head section-head-flanked">
                <Starburst />
                <h2>{page.sectionTitle}</h2>
                <Starburst />
              </div>
              <div className="values-grid air-cards">
                {page.cards.map((c) => (
                  <div key={c.title} className="value-card">
                    <Starburst />
                    <h3>
                      <strong>{c.title}</strong>
                    </h3>
                    {(c.paragraphs || [c.text]).map((p) => (
                      <p key={p.slice(0, 24)}>{p}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* OCEAN layout */}
      {pageKey === 'ocean' && (
        <>
          <section className="section-sm">
            <div className="container about-grid">
              <div className="about-media">
                <img src={page.intro.image} alt={page.intro.heading} style={{ borderRadius: 19 }} />
              </div>
              <div className="about-copy">
                <span className="kicker">{page.kicker}</span>
                <h2>{page.intro.heading}</h2>
                {page.intro.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </div>
          </section>
          <section className="section-sm services-white">
            <div className="container">
              <div className="values-grid air-cards">
                {page.intro.points.map((point) => (
                  <div key={point.title} className="value-card">
                    <Starburst />
                    <h3>
                      <strong>{point.title}</strong>
                    </h3>
                    <p>{point.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ROAD layout */}
      {pageKey === 'road' && (
        <>
          <section className="section-sm">
            <div className="container">
              <span className="kicker">{page.kicker}</span>
              <h2 className="big-title">{page.sectionTitle}</h2>
              {paragraphs(page.sectionText)}
            </div>
          </section>
          <section className="section-sm services-white">
            <div className="container">
              <div className="section-head section-head-flanked">
                <Starburst />
                <h2>
                  <strong>{page.overlandTitle}</strong>
                </h2>
                <Starburst />
              </div>
              {page.overlandParagraphs.map((p) => (
                <p key={p.slice(0, 24)} className="overland-p">
                  {p}
                </p>
              ))}
              <p className="subheading">
                <strong>{page.listTitle}</strong>
              </p>
              <div className="road-cards">
                {page.list.map((item) => (
                  <div key={item} className="value-card road-card">
                    <Starburst />
                    <h3>{item}</h3>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}
