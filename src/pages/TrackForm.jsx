import PageHero from '../components/PageHero.jsx'
import TrackForm from '../components/TrackForm.jsx'

export default function TrackFormPage() {
  return (
    <>
      <PageHero title="Logistics" />
      <section className="section-y">
        <div className="container-x">
          <TrackForm />
        </div>
      </section>
    </>
  )
}
