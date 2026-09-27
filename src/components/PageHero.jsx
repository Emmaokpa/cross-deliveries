export default function PageHero({ title, image = '/images/freight.jpg', srcSet, sizes = '100vw' }) {
  return (
    <section className="page-hero">
      <img
        src={image}
        srcSet={srcSet}
        sizes={sizes}
        alt=""
        className="page-hero-bg"
        loading="eager"
        decoding="async"
      />
      <div className="page-hero-overlay" />
      <div className="container">
        <h1>{title}</h1>
      </div>
    </section>
  )
}
