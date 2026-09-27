// Build a responsive srcSet from WP-style size variants (NAME-WxH.ext)
export function buildSrcSet(path, variants) {
  const dot = path.lastIndexOf('.')
  const stem = path.slice(0, dot)
  const ext = path.slice(dot)
  return variants.map((v) => `${stem}-${v}${ext} ${v.split('x')[0]}w`).join(', ')
}

export const siteInfo = {
  name: 'CrossBordersDeliveries.com',
  tagline: 'leading logistics and distribution services',
  address: 'No. 19/3 PK. 34810 Beykoz / Instabul Turkiye',
  email: 'crossborder.delivery@outlook.com',
  phones: '+908060552123, +902166809250',
}

export const navMenu = [
  { label: 'Home', path: '/' },
  { label: 'About Us', path: '/about-us' },
  {
    label: 'Services',
    path: '/',
    children: [
      { label: 'International Freight', path: '/international-freight' },
      { label: 'Domestic Freight', path: '/domestic-freight' },
      { label: 'Consultation', path: '/consultation' },
    ],
  },
  {
    label: 'Freight',
    path: '/',
    children: [
      { label: 'Air Freight Forwarding', path: '/air-freight-forwarding' },
      { label: 'Ocean Freight Forwarding', path: '/ocean-freight-forwarding' },
      { label: 'Road Freight Forwarding', path: '/road-freight-forwarding' },
    ],
  },
  { label: 'Logistics', path: '/track-form' },
  { label: 'Contact Us', path: '/contact-us' },
]

export const heroSlides = [
  {
    image: '/images/1-1.png',
    srcSet: buildSrcSet('/images/1-1.png', ['300x169', '1024x576']),
    title: 'We Are Global Logistics Solution Provider',
    text: 'By air, sea or via large and modern cargo trucks.',
  },
  {
    image: '/images/3.png',
    srcSet: buildSrcSet('/images/3.png', ['300x169', '1024x576']),
    title: 'Delivering Excellence',
    text: 'Our services are available 24/7',
  },
  {
    image: '/images/2.png',
    srcSet: buildSrcSet('/images/2.png', ['300x169', '1024x576']),
    title: 'Cross Borders Deliveries.',
    text: 'specializes in delivering customized transportation solutions.',
  },
]

export const services = [
  {
    label: 'Air Freight',
    image: '/images/Untitled-design-6.png',
    srcSet: buildSrcSet('/images/Untitled-design-6.png', ['300x169', '768x432', '1024x576', '1536x864']),
    text: 'As a leader in global air freight forwarding, CrossBordersDeliveries specializes in delivering customized transportation solutions.',
    path: '/air-freight-forwarding',
  },
  {
    label: 'Road Freight',
    image: '/images/truck.png',
    srcSet: buildSrcSet('/images/truck.png', ['300x300', '768x768', '1024x1024']),
    text: 'At various stages of their journey, cargo travels along the world’s roads, where we provide a reliable and reassuring presence every step of the way.',
    path: '/road-freight-forwarding',
  },
  {
    label: 'Ocean Freight',
    image: '/images/ship.png',
    srcSet: buildSrcSet('/images/ship.png', ['300x300', '768x768', '1024x1024']),
    text: 'Ocean freight is often the backbone of transportation and supply chain solutions. We deliver efficient and reliable ocean freight services to meet your needs.',
    path: '/ocean-freight-forwarding',
  },
]

export const partnerLogos = [
  '/brand/logo-1.png',
  '/brand/logo-2.png',
  '/brand/logo-3.png',
  '/brand/logo-4.png',
  '/brand/logo-5.png',
  '/brand/logo-6.png',
]

export const footerLinks = {
  quickLinks: [
    { label: 'Logistics', path: '/track-form' },
    { label: 'About Us', path: '/about-us' },
    { label: 'Contact', path: '/contact-us' },
  ],
  ourServices: [
    { label: 'International Freight', path: '/international-freight' },
    { label: 'Domestic Freight', path: '/domestic-freight' },
    { label: 'Consultation', path: '/consultation' },
  ],
  freight: [
    { label: 'Air Freight Forwarding', path: '/air-freight-forwarding' },
    { label: 'Ocean Freight Forwarding', path: '/ocean-freight-forwarding' },
    { label: 'Road Freight Forwarding', path: '/road-freight-forwarding' },
  ],
}

export const pages = {
  about: {
    slug: 'about-us',
    title: 'About Us',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    intro: {
      image: '/images/Kingcefo-Logo-9.png',
      imageSrcSet: buildSrcSet('/images/Kingcefo-Logo-9.png', ['150x150', '300x300']),
      kicker: 'Cross Borders Deliveries',
      heading: 'Providing Full Rang of Courier And Logistics Services Worldwide',
      paragraphs: [
        'Cross Borders Deliveries is a leading logistics and distribution services company established in 2009. We offer a wide array of express courier and logistic support solutions to our various customers worldwide.',
        'With over 400 highly skilled personnel, we have excellent competencies in striving sectors such as financial services, manufacturing, telecommunications, government agencies, and oil & gas/utilities. As a diverse end-to-end logistics solutions provider.',
        'We offer a range of expertise aimed at helping customers re-engineer and re-invent their businesses to compete successfully in an ever-changing marketplace, with the final objective of safely and promptly delivering all our customers consignments as expected.',
      ],
    },
    values: [
      {
        icon: 'fa-solid fa-paper-plane',
        title: 'Our Mission',
        text: 'We meet our customers’ demands for a personal & professional service by offering innovative supply chain solutions.',
      },
      {
        icon: 'fa-solid fa-eye',
        title: 'Our Vision',
        text: 'We proactively and constantly look for new possibilities. Therefore, an important part of our vision is to attract & retain.',
      },
      {
        icon: 'fa-solid fa-wand-magic-sparkles',
        title: 'Core Values',
        text: 'Procedures, values, and attitudes are crucial to our reputation—not to mention the success we enjoy.',
      },
    ],
  },
  consultation: {
    slug: 'consultation',
    title: 'Consultation',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    intro: {
      image: '/images/As-you-light-the-Diwali-lamps-may-your-life-be-brightened-with-good-health-wealth-and-happiness.-Happy-Diwali-13-1024x770.png',
      heading: 'Top Class Freight Consultation Services',
      paragraphs: [
        'Our freight & logistics consultants work with express, parcel, postal, trucking, 3PL, rail, transport infrastructure, ocean shipping, and distribution networks.',
        'At Cross Borders Deliveries, our freight and logistics consultancy services have helped countless companies around the world find the most efficient and cost effective way to ship goods. From planning routes to handling administrative work, we consult on all aspects of freight movement.',
      ],
      subheading: 'Freight Movement and Route Planning',
      subParagraph:
        'Moving goods around the world requires multiple modes of transport and overcoming several logistical challenges. If goods are moving from North America to mainland Asia, they are likely transported with a combination of road, rail, and sea freight.',
    },
  },
  international: {
    slug: 'international-freight',
    title: 'International Freight',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    sectionTitle: 'International Freight?',
    sectionText:
      'International freight shipping through Cross Borders Deliveries gives you options for sending shipments over 150 lbs. around the world. You can choose from air, land, and sea services that deliver the right balance of price and speed for your business.\nAir & Sea Freight services are available to any destination in the world. Cross Borders Deliveries is one of the few leading transport company in Turkey that can provide all the services in the Air or Sea Freight industry',
    features: [
      {
        title: 'YOUR BUSINESS EXPANSION AND FLIGHT LANES',
        text: 'Options to help you expand your business and grow into new international markets with full access to international freight lanes with a focus on APAC and EU.',
      },
      {
        title: 'BEST CUSTOMER SUPPORT AND EASY TOOLS',
        text: 'A responsive, reliable, knowledgeable customer service team and easy-to-use tools to guide you through shipping internationally.',
      },
    ],
    banner: {
      image: '/images/Untitled-design-8.png',
      title: 'Transportation & Distribution Solutions',
      text: 'If you need bespoke transport solutions, covering managed transport, oversized or heavy cargo & direct distribution – visit our solutions & special expertise page.',
    },
    cards: [
      { title: 'Air Freight', text: 'Reliable and hassle free. Broad range of delivery speeds and service options.' },
      { title: 'Ocean Freight', text: 'We provide a reliable and efficient global ocean freight service covering major ports and trade lanes.' },
    ],
  },
  domestic: {
    slug: 'domestic-freight',
    title: 'Domestic Freight',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    sectionTitle: 'Over-The-Road Services',
    sectionText:
      'Our wide range of domestic freight services will get your goods safely across the city, state, or country, and over the road, by rail, or by sea.',
    image: '/images/Untitled-design-4.png',
    accordionTitle: 'Domestic Ocean Freight Services',
    faqs: [
      {
        q: '01. Full Container FCL',
        a: 'We offer you Full-Container-Load (FCL) Ocean Freight options to provide reliable, flexible & cost efficient transportation globally.',
      },
      {
        q: '02. Less Than Full Container LCL',
        a: 'Cross Borders Deliveries offers weekly LCL services across major trade routes. Our team of experts handle your shipments end-to-end through our strong global network',
      },
      {
        q: '03. Door to Door',
        a: 'We offer a wide selection of door-to-door services for shipping any item. From simple parcel delivery to complex freight requirements.',
      },
    ],
  },
  air: {
    slug: 'air-freight-forwarding',
    title: 'Air Freight Forwarding',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    intro: {
      image: '/images/Untitled-design-6.png',
      imageSrcSet: buildSrcSet('/images/Untitled-design-6.png', ['300x169', '768x432', '1024x576', '1536x864']),
      heading: 'Air Freight Carrier',
      paragraphs: [
        'Domestic and International Air Freight service for any kind of goods enables the customer to ship anything in the process of relocating.',
        'We can meet all customer transportation needs around the world by our Air Freight Services. We bring customers shipments on time with safety to any destination in the world.',
      ],
    },
    sectionTitle: 'Air Freight Service',
    cards: [
      {
        title: 'International Air Freight',
        text: 'We service door to door service to major metropolitan areas around the world. When the customer needs some emergency international shipping, we offer some special service of Air freight solutions to deliver customer’s goods via fastest possible way of shipping.',
      },
      {
        title: 'Domestic Air Freight',
        paragraphs: [
          'We are dedicated to delivering goods on time to meet customer’s needs by our well-trained professionals; they ensure to deliver these products effectively and efficiently.',
          'We make sure that the cargo is delivered very safely via air freight. All the procedures are well executed right from the storage to the customer’s destination.',
        ],
      },
    ],
  },
  ocean: {
    slug: 'ocean-freight-forwarding',
    title: 'Ocean Freight Forwarding',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    kicker: 'OCEAN FREIGHT',
    intro: {
      image: '/images/As-you-light-the-Diwali-lamps-may-your-life-be-brightened-with-good-health-wealth-and-happiness.-Happy-Diwali-12-1024x1024.png',
      imageSrcSet: buildSrcSet('/images/As-you-light-the-Diwali-lamps-may-your-life-be-brightened-with-good-health-wealth-and-happiness.-Happy-Diwali-12.png', ['150x150', '300x300', '768x768', '1024x1024']),
      heading: 'The World is Your Oyster',
      paragraphs: [
        'Cross Borders Deliveries offers a flexible range of global and local Ocean Freight services for both Less-Than-Container Load (LCL) and Full-Container Load (FCL) shipments.',
        'With our broad product range, we cover different equipment types and consolidation services to ensure your cargo reaches the right place at the right time in a cost-efficient way. In order to deliver the highest reliability, we have planned space protection from every major container port in the world.',
      ],
      points: [
        {
          title: 'Expertise',
          text: 'We have logistics experts specialising in major industry sectors, so we can help you improve your performance and drive out costs.',
        },
        {
          title: 'Global Reach',
          text: 'We’re on the ground in over 190 countries, allowing you to export and import from more locations worldwide. Providing more ocean loops and services than anyone else.',
        },
        {
          title: 'Quality Control',
          text: 'SML Courier Ocean Freight shipments include a wide range of quality controlled equipment types. We strive for on time deliverability and provide end-to-end visibility.',
        },
      ],
    },
  },
  road: {
    slug: 'road-freight-forwarding',
    title: 'Road Freight Forwarding',
    heroImage: '/images/freight.jpg',
    heroSrcSet: buildSrcSet('/images/freight.jpg', ['300x169', '768x432']),
    kicker: 'CROSS BORDERS DELIVERIES',
    sectionTitle: 'Road Freight Forwarding Services',
    sectionText:
      'Cross Borders Deliveries offers rapid land-based door-to-door freight deliveries, including groupage, part-load, full-load, and express services. You’ll get the benefit of our extensive experience in managing freight services through an established network of selected road, rail and intermodal partners\nWe provide transport to all destinations, whether personal effects, bulk/project cargo, containerised or loose cargo.\nWe have a wide expertise in road freight services in Turkey and beyond.\nWe have state of the art fleet, maintained in top notch condition, guaranteeing excellence in our Road Freight services. All our drivers are qualified and have many years of experience in driving trucks across several countries, this helps to add on to the safety of your cargo while on the road.',
    overlandTitle: 'The Overland Solution',
    overlandParagraphs: [
      'We offer a broad spectrum of overland services to several countries in Africa. Our team of road freight experts are dedicated to finding the most suitable solution for your transportation needs, whether you are looking to ship full truck loads or less than truck loads.',
      'We act as an extension of your business operations, creating freight movement solutions which match your needs and goals.',
      'With our expertise and infrastructure we can provide tailor-made solutions that help you achieve your goals in terms of capacity, frequency and most importantly, your costs. Partnering with us will give you the peace of mind that your goods will efficiently reach its various destinations within your desired time requirements.',
    ],
    listTitle: 'Our Road Cargo Services Comprised of:',
    list: [
      'Full Truck Load (door step delivery)',
      'Partial truck load (door step delivery)',
      'Tailored solutions',
      'Multimodal transportation',
    ],
  },
}
