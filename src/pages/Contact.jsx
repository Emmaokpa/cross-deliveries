import PageHero from '../components/PageHero.jsx'
import TrackForm from '../components/TrackForm.jsx'
import { siteInfo } from '../data/site.js'

const contactCards = [
  {
    icon: 'fa-solid fa-address-book',
    color: '#fea116',
    title: 'Official Address',
    content: siteInfo.address,
  },
  {
    icon: 'fa-regular fa-envelope',
    color: '#1cb5a3',
    title: 'Email Us',
    content: siteInfo.email,
  },
  {
    icon: 'fa-solid fa-phone',
    color: '#f25589',
    title: 'Call Us',
    content: siteInfo.phones,
  },
]

export default function Contact() {
  return (
    <>
      <PageHero title="Contact Us" />

      <section className="section-sm">
        <div className="container">
          <TrackForm />
        </div>
      </section>

      <section className="section-sm contact-cards-section">
        <div className="container">
          <div className="contact-cards">
            {contactCards.map((card) => (
              <div key={card.title} className="contact-card">
                <div className="contact-icon" style={{ color: card.color }}>
                  <i className={card.icon} aria-hidden="true" />
                </div>
                <h3 style={{ color: card.color }}>{card.title}</h3>
                <p>{card.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="map-section">
        <iframe
          title="Google Map"
          src="https://www.google.com/maps?q=turkey&output=embed&hl=en&z=12"
          loading="lazy"
        />
      </section>
    </>
  )
}
