import { heroSlides } from '../data/site.js'

// ─────────────────────────────────────────────────────────────────
// Homepage hero banner — mirrors the original WordPress layout:
// a large cargo-truck visual with a deep dark navy gradient overlay
// on the LEFT (#031435 fading out to the right) and left-aligned
// headline + sub-headline over the overlay.
// ─────────────────────────────────────────────────────────────────
export default function Hero() {
  const hero = heroSlides[0]

  return (
    <section className="relative flex min-h-[clamp(24rem,72vw,30rem)] items-center overflow-hidden bg-navy md:min-h-[clamp(28rem,50vw,36rem)]">
      <img
        src={hero.image}
        srcSet={hero.srcSet}
        sizes="100vw"
        alt={hero.title}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Deep navy gradient — solid on the left, fading out towards the right */}
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

      <div className="container-x relative z-[2] py-14 sm:py-16">
        <h1 className="max-w-[19ch] font-heading text-[clamp(1.75rem,1.1rem+3.2vw,3rem)] font-bold uppercase leading-[1.15] tracking-[0.02em] text-white">
          {hero.title}
        </h1>
        <p className="mt-4 max-w-[34ch] font-body text-[clamp(1rem,0.95rem+0.4vw,1.3125rem)] font-light leading-snug text-white/85">
          {hero.text}
        </p>
      </div>
    </section>
  )
}
