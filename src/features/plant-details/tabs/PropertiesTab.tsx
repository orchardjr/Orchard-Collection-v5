import type { ReactNode } from 'react'

import { Card } from '../../../components/ui/Card'
import { PropertyField } from '../../../components/ui/PropertyField'

export interface DynamicProperty {
  id: string
  label: string
  value?: ReactNode
}

interface PropertiesTabProps {
  properties: DynamicProperty[]
}

export function PropertiesTab({ properties }: PropertiesTabProps) {
  return (
    <Card
      title="Properties"
      description="System metadata for this item. Dynamic property editing is not available in this release."
    >
      {properties.length ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyField
              key={property.id}
              label={property.label}
              value={property.value}
            />
          ))}
        </dl>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No properties have been added yet.
        </p>
      )}
    </Card>
  )
}
