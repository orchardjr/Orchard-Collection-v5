import { useCollectionStore } from '../../stores/collectionStore'

export function CollectionPage() {
  const selectedCategory = useCollectionStore((state) => state.selectedCategory)

  return (
    <section>
      <p className="text-sm uppercase tracking-[0.2em] text-lime-300">
        Collection
      </p>
      <h1 className="mt-3 text-4xl font-semibold">Your orchard</h1>
      <p className="mt-4 text-stone-400">
        Current view: {selectedCategory ?? 'Everything'}
      </p>
      <div className="mt-12 rounded-3xl border border-dashed border-white/15 p-12 text-center text-stone-500">
        Your collection is ready for its first item.
      </div>
    </section>
  )
}
