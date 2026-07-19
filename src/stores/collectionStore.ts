import { create } from 'zustand'

interface CollectionState {
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
}

export const useCollectionStore = create<CollectionState>((set) => ({
  selectedCategory: null,
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}))
