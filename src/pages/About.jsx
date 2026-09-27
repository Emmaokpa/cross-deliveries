import PageHero from '../components/PageHero.jsx'
import { pages } from '../data/site.js'

export default function About() {
  const { about } = pages
  return (
    <>
      <PageHero title={about.title} image={about.heroImage} srcSet={about.heroSrcSet} />

      <section className="section-sm">
        <div className="container about-grid">
          <div className="about-media">
            <img
              src={about.intro.image}
              srcSet={about.intro.imageSrcSet}
              sizes="(max-width: 900px) 100vw, 45vw"
              alt="About Cross Borders Deliveries"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="about-copy">
            <span className="kicker">{about.intro.kicker}</span>
            <h2>{about.intro.heading}</h2>
            {about.intro.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm what-we-do">
        <div className="container">
          <div className="section-head left">
            <span className="kicker">Our Services</span>
            <h2>What We Do?</h2>
          </div>
          <div className="values-grid">
            {about.values.map((value) => (
              <div key={value.title} className="value-card">
                <i className={value.icon} aria-hidden="true" />
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
