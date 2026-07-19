import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { PlantDetailsTabs, type PlantDetailsTabId } from './PlantDetailsTabs'

function TabsHarness() {
  const [activeTab, setActiveTab] = useState<PlantDetailsTabId>('overview')
  return <PlantDetailsTabs activeTab={activeTab} onChange={setActiveTab} />
}

describe('PlantDetailsTabs', () => {
  it('supports arrow-key navigation', () => {
    render(<TabsHarness />)
    const overview = screen.getByRole('tab', { name: 'Overview' })
    const timeline = screen.getByRole('tab', { name: 'Timeline' })

    overview.focus()
    fireEvent.keyDown(overview, { key: 'ArrowRight' })

    expect(timeline).toHaveAttribute('aria-selected', 'true')
    expect(timeline).toHaveFocus()
  })
})
