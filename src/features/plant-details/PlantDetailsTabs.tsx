import { useRef, type KeyboardEvent } from 'react'

export type PlantDetailsTabId =
  'overview' | 'timeline' | 'photos' | 'care' | 'notes' | 'properties'

const tabs: Array<{ id: PlantDetailsTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'photos', label: 'Photos' },
  { id: 'care', label: 'Care' },
  { id: 'notes', label: 'Notes' },
  { id: 'properties', label: 'Properties' },
]

interface PlantDetailsTabsProps {
  activeTab: PlantDetailsTabId
  onChange: (tab: PlantDetailsTabId) => void
}

export function PlantDetailsTabs({
  activeTab,
  onChange,
}: PlantDetailsTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
            tabs.length
    const nextTab = tabs[nextIndex]
    if (nextTab) {
      onChange(nextTab.id)
      tabRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl border border-border/70 bg-surface p-1.5 shadow-sm"
      role="tablist"
      aria-label="Plant details sections"
    >
      <div className="flex min-w-max gap-1">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={`plant-tab-${tab.id}`}
            aria-controls={`plant-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${activeTab === tab.id ? 'bg-accent-soft text-accent shadow-sm' : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
