import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import TrackForm from './pages/TrackForm.jsx'
import ServicePage from './pages/ServicePage.jsx'
import NotFound from './pages/NotFound.jsx'

const serviceRoutes = [
  { path: '/international-freight', pageKey: 'international' },
  { path: '/domestic-freight', pageKey: 'domestic' },
  { path: '/consultation', pageKey: 'consultation' },
  { path: '/air-freight-forwarding', pageKey: 'air' },
  { path: '/ocean-freight-forwarding', pageKey: 'ocean' },
  { path: '/road-freight-forwarding', pageKey: 'road' },
]

export default function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/contact-us" element={<Contact />} />
        <Route path="/track-form" element={<TrackForm />} />
        {serviceRoutes.map(({ path, pageKey }) => (
          <Route key={path} path={path} element={<ServicePage pageKey={pageKey} />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
