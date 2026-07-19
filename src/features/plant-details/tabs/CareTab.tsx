import { CircleCheck, CircleX, Droplets, Sprout } from 'lucide-react'

import { Card } from '../../../components/ui/Card'
import { PropertyField } from '../../../components/ui/PropertyField'
import type { Plant } from '../../../models'

interface CareTabProps {
  plant: Plant
}

function interval(days?: number) {
  if (days === undefined) return undefined
  if (days === 0) return 'Not applicable'
  return `Every ${days} ${days === 1 ? 'day' : 'days'}`
}

export function CareTab({ plant }: CareTabProps) {
  return (
    <Card
      title="Care profile"
      description="The current routine for this collection item. Care editing is not available in this release."
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <PropertyField
          label="Water interval"
          value={interval(plant.waterIntervalDays)}
          icon={Droplets}
          emptyValue="Not set"
        />
        <PropertyField
          label="Fertilizer interval"
          value={interval(plant.fertilizerIntervalDays)}
          icon={Sprout}
          emptyValue="Not set"
        />
        <PropertyField
          label="Mounted"
          value={
            plant.mounted === undefined
              ? undefined
              : plant.mounted
                ? 'Yes'
                : 'No'
          }
          icon={plant.mounted ? CircleCheck : CircleX}
          emptyValue="Not set"
        />
        <PropertyField
          label="Moss pole"
          value={
            plant.mossPole === undefined
              ? undefined
              : plant.mossPole
                ? 'Yes'
                : 'No'
          }
          icon={plant.mossPole ? CircleCheck : CircleX}
          emptyValue="Not set"
        />
      </dl>
      <div className="mt-5 rounded-xl border border-border bg-background p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Care notes
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
          {plant.careNotes || 'No care notes have been added yet.'}
        </p>
      </div>
    </Card>
  )
}
