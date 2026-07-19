import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="py-20">
      <p className="text-lime-300">404</p>
      <h1 className="mt-2 text-4xl font-semibold">This path is overgrown.</h1>
      <Link
        className="mt-6 inline-block text-stone-400 underline hover:text-white"
        to="/"
      >
        Return home
      </Link>
    </section>
  )
}
