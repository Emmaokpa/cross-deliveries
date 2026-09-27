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

      <section className="section-y">
        <div className="container-x">
          <TrackForm />
        </div>
      </section>

      <section className="section-y bg-light">
        <div className="container-x grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {contactCards.map((card) => (
            <div
              key={card.title}
              className="flex flex-col items-start gap-2.5 bg-white p-7 shadow-[2px_2px_30px_0_rgba(0,0,0,0.102)] sm:p-8"
            >
              <div className="text-[28px]" style={{ color: card.color }}>
                <i className={card.icon} aria-hidden="true" />
              </div>
              <h3 className="w-full min-w-0 break-words" style={{ color: card.color }}>
                {card.title}
              </h3>
              <p className="w-full min-w-0 break-words">{card.content}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <iframe
          title="Google Map"
          src="https://www.google.com/maps?q=turkey&output=embed&hl=en&z=12"
          loading="lazy"
          className="block min-h-[280px] w-full border-0 md:min-h-[400px]"
        />
      </section>
    </>
  )
}
