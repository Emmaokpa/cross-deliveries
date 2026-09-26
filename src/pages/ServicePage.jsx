import PageHero from '../components/PageHero.jsx'
import { pages } from '../data/site.js'

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
              <div className="section-head">
                <h2>{page.sectionTitle}</h2>
              </div>
              <div className="values-grid">
                {page.cards.map((c) => (
                  <div key={c.title} className="value-card">
                    <i className="fa-solid fa-plane" aria-hidden="true" />
                    <h3>
                      <strong>{c.title}</strong>
                    </h3>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* OCEAN layout */}
      {pageKey === 'ocean' && (
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
              {page.intro.points.map((point) => (
                <p key={point.title}>
                  <strong>{point.title}</strong>
                  {point.text}
                </p>
              ))}
            </div>
          </div>
        </section>
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
              <div className="section-head">
                <h2>
                  <strong>{page.overlandTitle}</strong>
                </h2>
              </div>
              {page.overlandParagraphs.map((p) => (
                <p key={p.slice(0, 24)} className="overland-p">
                  {p}
                </p>
              ))}
              <p className="subheading">
                <strong>{page.listTitle}</strong>
              </p>
              <ul className="check-list">
                {page.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </>
  )
}
