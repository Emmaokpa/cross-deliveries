export default function PageHero({ title, image = '/images/freight.jpg', srcSet, sizes = '100vw' }) {
  return (
    <section className="relative flex min-h-[clamp(15rem,38vw,25.3rem)] items-center overflow-hidden max-md:min-h-60">
      <img
        src={image}
        srcSet={srcSet}
        sizes={sizes}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="container-x relative z-[2]">
        <h1 className="text-center text-white">{title}</h1>
      </div>
    </section>
  )
}
