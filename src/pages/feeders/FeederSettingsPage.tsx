import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import {
  feederSettingsRepository,
  feederSpeciesRepository,
} from '../../db/repositories'
import { FeederFormDialog } from '../../features/feeders/FeederFormDialog'
import { useFeederData, useFeederMutation } from '../../hooks/useFeederData'

export function FeederSettingsPage() {
  const query = useFeederData()
  const [species, setSpecies] = useState(false)
  const addSpecies = useFeederMutation(async (v: { name: string }) =>
    feederSpeciesRepository.create({ name: v.name, active: true }),
  )
  const update = useFeederMutation(async (v: { id: string; value: number }) =>
    feederSettingsRepository.update(v.id, { value: v.value }),
  )
  return (
    <Page
      title="Feeder Settings"
      subtitle="Species library and care interval defaults."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Feeder species</h2>
            <Button variant="secondary" onClick={() => setSpecies(true)}>
              <Plus size={17} />
              Add
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {query.data?.species.map((s) => (
              <p key={s.id} className="py-3">
                {s.name}
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Maintenance intervals</h2>
          <div className="mt-4 space-y-3">
            {query.data?.settings.map((s) => (
              <label
                key={s.id}
                className="flex items-center justify-between gap-3"
              >
                <span>{s.label}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    defaultValue={s.value}
                    onBlur={(e) =>
                      void update.mutateAsync({
                        id: s.id,
                        value: Number(e.target.value),
                      })
                    }
                    className="h-11 w-20 rounded-xl border border-border bg-background px-3"
                  />
                  days
                </span>
              </label>
            ))}
          </div>
        </Card>
      </div>
      {species && (
        <FeederFormDialog
          title="Add feeder species"
          fields={[{ name: 'name', label: 'Species name', required: true }]}
          error={addSpecies.error?.message}
          onClose={() => setSpecies(false)}
          onSave={async (v) => {
            await addSpecies.mutateAsync({ name: v.name })
            setSpecies(false)
          }}
        />
      )}
    </Page>
  )
}
