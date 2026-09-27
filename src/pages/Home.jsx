import { Link } from 'react-router-dom'
import HeroSlider from '../components/HeroSlider.jsx'
import TrackForm from '../components/TrackForm.jsx'
import { services, partnerLogos } from '../data/site.js'

export default function Home() {
  return (
    <>
      <HeroSlider />

      {/* Track shipment band */}
      <section
        className="track-band"
        style={{
          backgroundImage:
            '-webkit-image-set(url(/images/track-300x149.webp) 1x, url(/images/track.webp) 2x)',
          backgroundImage:
            'image-set(url(/images/track-300x149.webp) 300w, url(/images/track-768x381.webp) 768w, url(/images/track.webp) 1200w)',
        }}
      >
        <div className="track-band-overlay" />
        <div className="container track-band-inner">
          <TrackForm />
        </div>
      </section>

      {/* Why choose us */}
      <section className="section">
        <div className="container why-grid">
          <div className="why-media">
            <img
              src="/images/man.png"
              srcSet="/images/man-150x150.png 150w, /images/man-300x300.png 300w, /images/man-768x768.png 768w, /images/man.png 1024w"
              sizes="(max-width: 900px) 100vw, 40vw"
              alt="Logistics specialist"
              loading="lazy"
              decoding="async"
            />
            <div className="experience-badge">
              <div className="experience-top">
                <span className="experience-number">15 +</span>
              </div>
              <span className="experience-years">Years</span>
              <span className="experience-label">Experience</span>
              <span className="why-tag">*Why Choose Us*</span>
            </div>
          </div>
          <div className="why-copy">
            <h2>Safe, Reliable And Express Logistics Transport Solutions That Saves Your Time!</h2>
            <p>
              We pride ourselves on providing the best transport and shipping services available allover the
              world. Our skilled personnel, utilising the latest communications, tracking and processing,
              combined with decades of experience!
            </p>
          </div>
        </div>
      </section>

      {/* Specialist services */}
      <section className="section services-section">
        <div className="container">
          <div className="section-head">
            <span className="kicker-pill">WE SPECIALISE IN THE TRANSPORTATION</span>
            <h2>Specialist Logistics Services</h2>
          </div>
          <div className="services-grid">
            {services.map((service) => (
              <Link to={service.path} key={service.label} className="service-card">
                <img
                  src={service.image}
                  srcSet={service.srcSet}
                  sizes="(max-width: 900px) 100vw, (max-width: 1200px) 33vw, 400px"
                  alt={service.label}
                  loading="lazy"
                  decoding="async"
                />
                <div className="service-card-body">
                  <span className="service-tag">{service.label}</span>
                  <h3>{service.text}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Partner logos */}
      <section className="partners-band">
        <div className="container partners-row">
          {partnerLogos.map((logo) => (
            <img key={logo} src={logo} alt="Partner" />
          ))}
        </div>
      </section>
    </>
  )
}
