import PageHero from '../components/PageHero.jsx'
import { pages } from '../data/site.js'

export default function About() {
  const { about } = pages
  return (
    <>
      <PageHero title={about.title} image={about.heroImage} srcSet={about.heroSrcSet} />

      <section className="section-y">
        <div className="container-x grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <img
              src={about.intro.image}
              srcSet={about.intro.imageSrcSet}
              sizes="(max-width: 1024px) 100vw, 45vw"
              alt="About Cross Borders Deliveries"
              loading="lazy"
              decoding="async"
              className="w-full object-cover"
            />
          </div>
          <div className="px-1 sm:px-2 lg:px-0">
            <span className="mb-2 inline-block font-semibold tracking-wide text-primary">{about.intro.kicker}</span>
            <h2 className="mb-4 text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-snug lg:text-[clamp(1.75rem,1.1rem+3.2vw,2.375rem)]">
              {about.intro.heading}
            </h2>
            {about.intro.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-light">
        <div className="container-x">
          <div className="mb-8 text-left lg:mb-10">
            <span className="mb-2 inline-block font-semibold tracking-wide text-primary">Our Services</span>
            <h2 className="text-[clamp(1.5rem,1.2rem+1.5vw,2rem)] font-semibold">What We Do?</h2>
          </div>
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {about.values.map((value) => (
              <div
                key={value.title}
                className="bg-white p-7 text-center shadow-[2px_2px_30px_0_rgba(0,0,0,0.102)] sm:p-8"
              >
                <i className={`${value.icon} mb-4 text-[34px] text-primary`} aria-hidden="true" />
                <h3 className="mb-3">{value.title}</h3>
                <p className="text-base">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
