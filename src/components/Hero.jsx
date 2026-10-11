import { useEffect, useState } from 'react'
import { heroSlides } from '../data/site.js'

// ─────────────────────────────────────────────────────────────────
// Homepage hero carousel — mirrors the original WordPress banner:
// cargo ships / trucks / shipping yards glide horizontally on an
// automatic interval, while the deep dark navy gradient overlay
// (#031435 fading out to the right) stays FIXED on top of the
// sliding images so the headline copy is legible at all times.
// ─────────────────────────────────────────────────────────────────
export default function Hero() {
  const [current, setCurrent] = useState(0)
  const count = heroSlides.length

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % count)
    }, 5500)
    return () => clearInterval(id)
  }, [count])

  return (
    <section className="relative flex min-h-[clamp(24rem,72vw,30rem)] items-center overflow-hidden bg-navy md:min-h-[clamp(28rem,50vw,36rem)]">
      {/* Sliding image track — pictures slide horizontally at regular intervals */}
      <div
        className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {heroSlides.map((slide, i) => (
          <img
            key={slide.image}
            src={slide.image}
            srcSet={slide.srcSet}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            decoding="async"
            className="h-full w-full min-w-full shrink-0 object-cover object-center"
          />
        ))}
      </div>

      {/* Fixed deep-navy gradient — sits above the sliding images, never moves */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #031435 0%, rgba(3,20,53,0.92) 32%, rgba(3,20,53,0.55) 58%, rgba(3,20,53,0) 88%)',
        }}
      />
      {/* Extra scrim on small screens so the left-aligned copy stays readable */}
      <div aria-hidden="true" className="absolute inset-0 bg-navy/35 md:hidden" />

      {/* Headline layer — crossfades between slides, always over the fixed overlay */}
      <div className="container-x relative z-[2] w-full py-14 sm:py-16">
        {heroSlides.map((slide, i) => (
          <div
            key={slide.title}
            className={`transition-opacity duration-700 ${
              i === current ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
            }`}
            aria-hidden={i !== current}
          >
            <h1 className="max-w-[19ch] font-heading text-[clamp(1.75rem,1.1rem+3.2vw,3rem)] font-bold uppercase leading-[1.15] tracking-[0.02em] text-white">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-[34ch] font-body text-[clamp(1rem,0.95rem+0.4vw,1.3125rem)] font-light leading-snug text-white/85">
              {slide.text}
            </p>
          </div>
        ))}
      </div>

      {/* Slide dots — kept above the floating tracking card */}
      <div className="absolute bottom-16 left-1/2 z-[3] flex -translate-x-1/2 gap-2.5 sm:bottom-20 lg:bottom-24">
        {heroSlides.map((slide, i) => (
          <button
            key={slide.image}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current}
            onClick={() => setCurrent(i)}
            className={`size-3 rounded-full border-2 border-white transition-colors duration-300 ${
              i === current ? 'border-primary bg-primary' : 'bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
