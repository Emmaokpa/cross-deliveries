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
    <section className="hero-slider">
      {heroSlides.map((slide, i) => (
        <div key={slide.image} className={`hero-slide${i === current ? ' active' : ''}`}>
          <img
            src={slide.image}
            srcSet={slide.srcSet}
            sizes="100vw"
            alt={slide.title}
            className="hero-slide-bg"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
          <div className="hero-slide-overlay" />
          <div className="hero-slide-content container">
            <h2>{slide.title}</h2>
            <p>{slide.text}</p>
          </div>
        </div>
      ))}
      <div className="hero-dots">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            className={i === current ? 'active' : ''}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </section>
  )
}
