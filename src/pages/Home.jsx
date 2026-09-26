import { Link } from 'react-router-dom'
import HeroSlider from '../components/HeroSlider.jsx'
import TrackForm from '../components/TrackForm.jsx'
import { services, partnerLogos } from '../data/site.js'

export default function Home() {
  return (
    <>
      <HeroSlider />

      {/* Track shipment band */}
      <section className="track-band" style={{ backgroundImage: 'url(/images/track.webp)' }}>
        <div className="track-band-overlay" />
        <div className="container track-band-inner">
          <TrackForm />
        </div>
      </section>

      {/* Why choose us */}
      <section className="section">
        <div className="container why-grid">
          <div className="why-media">
            <img src="/images/man.png" alt="Logistics specialist" />
            <div className="experience-badge">
              <div className="experience-top">
                <span className="experience-number">15 +</span>
                <span className="experience-years">Years</span>
              </div>
              <span className="experience-label">Experience</span>
            </div>
          </div>
          <div className="why-copy">
            <span className="kicker-pill">Why Choose Us</span>
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
            <span className="kicker-pill">We Specialise in the Transportation</span>
            <h2>Specialist Logistics Services</h2>
          </div>
          <div className="services-grid">
            {services.map((service) => (
              <Link to={service.path} key={service.label} className="service-card">
                <img src={service.image} alt={service.label} />
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
