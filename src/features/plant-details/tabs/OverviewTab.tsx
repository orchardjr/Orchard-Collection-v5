import { Card } from '../../../components/ui/Card'
import { PropertyField } from '../../../components/ui/PropertyField'
import type { Plant } from '../../../models'

interface OverviewTabProps {
  plant: Plant
}

function formatDate(date?: Date) {
  return date
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
    : '—'
}

export function OverviewTab({ plant }: OverviewTabProps) {
  const properties = [
    { label: 'Nickname', value: plant.nickname },
    { label: 'Scientific name', value: plant.scientificName },
    { label: 'Common name', value: plant.commonName },
    { label: 'Cultivar', value: plant.cultivar },
    { label: 'Vendor', value: plant.vendor },
    { label: 'Purchase date', value: formatDate(plant.purchaseDate) },
    {
      label: 'Status',
      value: <span className="capitalize">{plant.status}</span>,
    },
    { label: 'Favorite', value: plant.favorite ? 'Yes' : 'No' },
    { label: 'Created', value: formatDate(plant.createdAt) },
    { label: 'Updated', value: formatDate(plant.updatedAt) },
  ]

  return (
    <Card
      title="Plant overview"
      description="Identity and collection information"
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyField key={property.label} {...property} />
        ))}
      </dl>
    </Card>
  )
}
