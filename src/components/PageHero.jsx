export default function PageHero({ title, image = '/images/freight.jpg' }) {
  return (
    <section className="page-hero" style={{ backgroundImage: `url(${image})` }}>
      <div className="page-hero-overlay" />
      <div className="container">
        <h1>{title}</h1>
      </div>
    </section>
  )
}
