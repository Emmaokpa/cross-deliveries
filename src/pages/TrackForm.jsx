import PageHero from '../components/PageHero.jsx'
import TrackForm from '../components/TrackForm.jsx'

export default function TrackFormPage() {
  return (
    <>
      <PageHero title="Logistics" />
      <section className="section-sm">
        <div className="container">
          <TrackForm />
        </div>
      </section>
    </>
  )
}
