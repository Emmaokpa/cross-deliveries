import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import { pages, services } from '../data/site.js'

// Value proposition + company overview copy — matches the live site's
// brand identity text (also used on the homepage hero era sections).
const VALUE_KICKER = 'WE DELIVER TRUST'
const VALUE_HEADING = 'Safe, Reliable And Express Logistics Transport Solutions That Saves Your Time!'
const VALUE_PARAGRAPH =
  'We pride ourselves on providing the best transport and shipping services available allover the world. Our skilled personnel, utilising the latest communications, tracking and processing, combined with decades of experience!'

export default function About() {
  const { about } = pages
  return (
    <>
      <PageHero title={about.title} image={about.heroImage} srcSet={about.heroSrcSet} />

      {/* Company overview — "Providing Full Range of Courier And Logistics Services" */}
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

      {/* Stats + value proposition + core overview paragraph */}
      <section className="section-y bg-light">
        <div className="container-x grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          {/* Left: image + "15+ Years Experience" stat badge */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0">
            <img
              src="/images/man.png"
              srcSet="/images/man-150x150.png 150w, /images/man-300x300.png 300w, /images/man-768x768.png 768w, /images/man.png 1024w"
              sizes="(max-width: 1024px) 100vw, 40vw"
              alt="Logistics specialist"
              loading="lazy"
              decoding="async"
              className="aspect-[3/4] max-h-[30rem] w-full object-cover object-top lg:max-h-[44rem]"
            />
            <div className="absolute bottom-5 left-0 max-w-[calc(100%-2rem)] bg-navy p-3 text-left text-white sm:p-4 lg:bottom-10 lg:p-[18px_26px]">
              <div className="flex items-baseline">
                <span className="font-heading text-[clamp(2.25rem,6vw,4rem)] font-bold leading-none text-primary">
                  15 +
                </span>
              </div>
              <span className="mt-0.5 block font-heading text-xs sm:text-sm lg:text-[26px]">Years</span>
              <span className="mt-0.5 block text-xs sm:text-sm lg:text-[1.7rem]">Experience</span>
              <span className="mt-2.5 inline-block rounded-sm bg-primary px-3 py-1 text-[0.8rem] font-semibold tracking-wide text-white lg:text-[0.95rem]">
                *Why Choose Us*
              </span>
            </div>
          </div>

          {/* Right: value proposition + company overview copy */}
          <div className="px-1 sm:px-2 lg:px-0">
            <span className="mb-4 inline-block bg-white px-4 py-0.5 font-semibold text-primary">{VALUE_KICKER}</span>
            <h2 className="text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-snug tracking-wide lg:text-[clamp(1.75rem,1.1rem+3.2vw,2.8125rem)] lg:leading-[1.35]">
              {VALUE_HEADING}
            </h2>
            <p className="mt-5">{VALUE_PARAGRAPH}</p>
          </div>
        </div>
      </section>

      {/* Specialist Logistics Services — Air / Road / Ocean breakdown cards */}
      <section className="section-y">
        <div className="container-x">
          <div className="mb-8 text-center lg:mb-12">
            <span className="inline-block bg-light px-4 py-0.5 font-semibold text-primary">
              WE SPECIALISE IN THE TRANSPORTATION
            </span>
            <h2 className="mt-2 text-[clamp(1.75rem,1.1rem+3.2vw,2.8125rem)] font-semibold capitalize leading-tight">
              Specialist Logistics Services
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                to={service.path}
                key={service.label}
                className="group relative flex min-h-[300px] items-end overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-shadow duration-300 hover:shadow-[0_18px_42px_rgba(0,0,0,0.22)] sm:min-h-[340px] lg:min-h-[420px]"
              >
                <img
                  src={service.image}
                  srcSet={service.srcSet}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                  alt={service.label}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black" />
                <div className="relative z-[2] p-5 text-center">
                  <span className="mb-5 inline-block bg-primary px-4 py-0.5 font-semibold text-white">
                    {service.label}
                  </span>
                  <h3 className="text-left font-body text-[clamp(1.125rem,1rem+0.6vw,1.25rem)] font-medium leading-normal text-white transition-colors group-hover:text-gold">
                    {service.text}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision / Core Values */}
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
