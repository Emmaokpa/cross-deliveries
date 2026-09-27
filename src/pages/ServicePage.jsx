import PageHero from '../components/PageHero.jsx'
import TrackForm from '../components/TrackForm.jsx'
import { pages } from '../data/site.js'

function Starburst({ className }) {
  return (
    <svg
      className={`block shrink-0 ${className || ''}`}
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
    <div className="space-y-3.5">
      {items.map((item) => (
        <details key={item.q} open className="bg-white p-4 shadow-[2px_2px_30px_0_rgba(0,0,0,0.102)] sm:px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between font-body text-lg font-semibold text-black">
            {item.q}
            <span>▾</span>
          </summary>
          <p className="mt-3">{item.a}</p>
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
      <PageHero title={page.title} image={page.heroImage} srcSet={page.heroSrcSet} />

      {/* CONSULTATION layout */}
      {pageKey === 'consultation' && (
        <section className="section-y">
          <div className="container-x grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div className="mx-auto w-full max-w-md lg:mx-0">
              <img
                src={page.intro.image}
                srcSet={page.intro.imageSrcSet}
                sizes="(max-width: 1024px) 100vw, 45vw"
                alt={page.intro.heading}
                loading="lazy"
                decoding="async"
                className="w-full object-cover"
              />
            </div>
            <div className="px-1 sm:px-2 lg:px-0">
              <h2 className="text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-snug lg:text-[clamp(1.75rem,1.1rem+3.2vw,2.375rem)]">
                {page.intro.heading}
              </h2>
              {page.intro.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              <p className="mt-4">
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
          <section className="section-y">
            <div className="container-x">
              <h2 className="mb-4 text-[clamp(1.5rem,1.2rem+1.5vw,2rem)]">{page.sectionTitle}</h2>
              {paragraphs(page.sectionText)}
              <div className="mt-7 grid grid-cols-1 gap-7 md:grid-cols-2">
                {page.features.map((f) => (
                  <div key={f.title} className="bg-white p-7 shadow-[2px_2px_30px_0_rgba(0,0,0,0.102)] sm:p-8">
                    <h3 className="mb-2.5 text-[clamp(1.125rem,1rem+0.6vw,1.25rem)]">{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section
            className="relative bg-cover bg-center py-12 sm:py-16 lg:py-[70px]"
            style={{ backgroundImage: `url(${page.banner.image})` }}
          >
            <div className="absolute inset-0 bg-[rgba(20,40,80,0.55)]" />
            <div className="container-x relative z-[2] text-center">
              <h3 className="mb-2 font-body text-[clamp(1.25rem,1rem+1.5vw,1.75rem)] font-bold text-white">
                {page.banner.title}
              </h3>
              <p className="mx-auto max-w-3xl text-white">{page.banner.text}</p>
            </div>
          </section>
          <section className="section-y">
            <div className="container-x">
              <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                {page.cards.map((c) => (
                  <div
                    key={c.title}
                    className="bg-light p-7 shadow-[2px_2px_30px_0_rgba(0,0,0,0.102)] sm:p-8"
                  >
                    <h3 className="mb-2.5 text-[clamp(1.125rem,1rem+0.6vw,1.25rem)]">{c.title}</h3>
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
          <section className="section-y bg-[#f4f9fc]">
            <div className="container-x text-center">
              <h2 className="text-[clamp(1.5rem,1.2rem+1.5vw,2rem)]">{page.sectionTitle}</h2>
              <p className="mx-auto max-w-3xl">{page.sectionText}</p>
            </div>
          </section>
          <section className="section-y">
            <div className="container-x grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <div className="mx-auto w-full max-w-md lg:mx-0">
                <img
                  src={page.image}
                  alt={page.accordionTitle}
                  className="w-full rounded-[19px] object-cover"
                />
              </div>
              <div>
                <h2 className="mb-4 text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold lg:text-[clamp(1.5rem,1.2rem+1.5vw,2rem)]">
                  {page.accordionTitle}
                </h2>
                <FaqAccordion items={page.faqs} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* AIR layout */}
      {pageKey === 'air' && (
        <>
          <section
            className="relative bg-cover bg-center py-8 sm:py-10"
            style={{ backgroundImage: 'url(/images/track.webp)' }}
          >
            <div className="absolute inset-0 bg-navy/45" />
            <div className="container-x relative z-[2]">
              <TrackForm />
            </div>
          </section>
          <section className="section-y">
            <div className="container-x grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <div className="mx-auto w-full max-w-md lg:mx-0">
                <img
                  src={page.intro.image}
                  srcSet={page.intro.imageSrcSet}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  alt={page.intro.heading}
                  loading="lazy"
                  decoding="async"
                  className="w-full rounded-[19px] object-cover"
                />
              </div>
              <div className="px-1 sm:px-2 lg:px-0">
                <h2 className="text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-snug lg:text-[clamp(1.75rem,1.1rem+3.2vw,2.375rem)]">
                  {page.intro.heading}
                </h2>
                {page.intro.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </div>
          </section>
          <section className="section-y bg-light">
            <div className="container-x">
              <div className="mb-8 flex items-center justify-center gap-3 sm:gap-4 lg:mb-10">
                <Starburst />
                <h2 className="text-center text-[clamp(1.25rem,1rem+2vw,1.75rem)] font-semibold max-sm:gap-2.5">
                  {page.sectionTitle}
                </h2>
                <Starburst />
              </div>
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {page.cards.map((c) => (
                  <div key={c.title} className="rounded-lg bg-white p-7 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:p-8">
                    <div className="mx-auto mb-3.5 w-fit">
                      <Starburst />
                    </div>
                    <h3 className="mb-3.5">
                      <strong>{c.title}</strong>
                    </h3>
                    {(c.paragraphs || [c.text]).map((p) => (
                      <p key={p.slice(0, 24)} className="text-center leading-normal">
                        {p}
                      </p>
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
          <section className="section-y">
            <div className="container-x grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <div className="mx-auto w-full max-w-md lg:mx-0">
                <img
                  src={page.intro.image}
                  srcSet={page.intro.imageSrcSet}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  alt={page.intro.heading}
                  loading="lazy"
                  decoding="async"
                  className="w-full rounded-[19px] object-cover"
                />
              </div>
              <div className="px-1 sm:px-2 lg:px-0">
                <span className="mb-2 inline-block font-semibold tracking-wide text-primary">{page.kicker}</span>
                <h2 className="text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-snug lg:text-[clamp(1.75rem,1.1rem+3.2vw,2.375rem)]">
                  {page.intro.heading}
                </h2>
                {page.intro.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </div>
          </section>
          <section className="section-y bg-light">
            <div className="container-x">
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {page.intro.points.map((point) => (
                  <div key={point.title} className="rounded-lg bg-white p-7 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:p-8">
                    <div className="mx-auto mb-3.5 w-fit">
                      <Starburst />
                    </div>
                    <h3 className="mb-3">
                      <strong>{point.title}</strong>
                    </h3>
                    <p className="text-center leading-normal">{point.text}</p>
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
          <section className="section-y">
            <div className="container-x">
              <span className="mb-2 inline-block font-semibold tracking-wide text-primary">{page.kicker}</span>
              <h2 className="mb-4 text-[clamp(1.5rem,1.2rem+1.5vw,2rem)]">{page.sectionTitle}</h2>
              {paragraphs(page.sectionText)}
            </div>
          </section>
          <section className="section-y bg-light">
            <div className="container-x">
              <div className="mb-6 flex items-center justify-center gap-3 sm:gap-4">
                <Starburst />
                <h2 className="text-center text-[clamp(1.25rem,1rem+2vw,1.75rem)]">
                  <strong>{page.overlandTitle}</strong>
                </h2>
                <Starburst />
              </div>
              {page.overlandParagraphs.map((p) => (
                <p key={p.slice(0, 24)} className="mx-auto max-w-3xl">
                  {p}
                </p>
              ))}
              <p className="mx-auto mt-4 max-w-3xl">
                <strong>{page.listTitle}</strong>
              </p>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {page.list.map((item) => (
                  <div key={item} className="rounded-lg bg-white p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:p-7">
                    <div className="mx-auto mb-3 w-fit">
                      <Starburst />
                    </div>
                    <h3 className="m-0 text-[clamp(1rem,0.95rem+0.4vw,1.125rem)] leading-tight">{item}</h3>
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
