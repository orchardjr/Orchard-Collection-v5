import type { ReactNode } from 'react'

import { Card } from '../../../components/ui/Card'
import { Property } from '../../../components/ui/Property'

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
      description="Flexible metadata attached to this item"
    >
      {properties.length ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Property
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
