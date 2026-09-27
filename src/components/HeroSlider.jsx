import { useEffect, useState } from 'react'
import { heroSlides } from '../data/site.js'

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length)
    }, 5500)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="relative h-[clamp(22rem,68vw,27.5rem)] overflow-hidden bg-navy md:h-[clamp(25rem,52vw,35rem)]">
      {heroSlides.map((slide, i) => (
        <div key={slide.image} className={`absolute inset-0 opacity-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : ''}`}>
          <img
            src={slide.image}
            srcSet={slide.srcSet}
            sizes="100vw"
            alt={slide.title}
            className="h-full w-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
          <div className="absolute inset-0 bg-navy/55" />
          <div className="container-x relative z-[2] flex h-full flex-col items-center justify-center text-center">
            <h2 className="max-w-4xl font-heading text-[clamp(1.5rem,1.2rem+1.5vw,2rem)] font-semibold uppercase leading-tight text-white md:text-[clamp(1.75rem,1.1rem+3.2vw,2.8125rem)] md:leading-tight">
              {slide.title}
            </h2>
            <p className="mt-3.5 font-heading text-[clamp(1.125rem,1rem+0.6vw,1.375rem)] leading-tight text-white md:text-[clamp(1.75rem,3vw,2.375rem)]">
              {slide.text}
            </p>
          </div>
        </div>
      ))}
      <div className="absolute bottom-6 left-1/2 z-[3] flex -translate-x-1/2 gap-2.5">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            className={`size-3 rounded-full border-2 border-white p-0 transition-colors duration-300 ${i === current ? 'border-primary bg-primary' : 'bg-transparent'}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </section>
  )
}
