import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl py-20"
    >
      <p className="mb-4 font-mono text-sm uppercase tracking-[0.25em] text-lime-300">
        Orchard Collection · v5
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
        Keep the things worth remembering.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-400">
        A thoughtfully organized home for your personal collection, built to
        grow with every new find.
      </p>
      <Link
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-medium text-stone-950"
        to="/collection"
      >
        Browse collection
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </motion.section>
  )
}
