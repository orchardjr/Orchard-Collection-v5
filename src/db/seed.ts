import type { Plant, Space, Task, TimelineEvent } from '../models'
import { db } from './database'

const createdAt = new Date('2026-07-01T14:00:00.000Z')
const updatedAt = new Date('2026-07-18T14:00:00.000Z')

const spaces: Space[] = [
  {
    id: 'space-conservatory',
    name: 'Conservatory',
    description: 'Bright, humid room for tropical specimens.',
    type: 'greenhouse',
    createdAt,
    updatedAt,
  },
  {
    id: 'space-study',
    name: 'North Study',
    description: 'Filtered afternoon light and display shelving.',
    type: 'room',
    createdAt,
    updatedAt,
  },
  {
    id: 'space-vivarium',
    name: 'Rainforest Vivarium',
    description: 'Climate-controlled habitat for the collection animal.',
    type: 'cabinet',
    createdAt,
    updatedAt,
  },
]

const plants: Plant[] = [
  {
    id: 'plant-monstera-albo',
    nickname: 'Alba',
    scientificName: 'Monstera deliciosa',
    commonName: 'Monstera albo',
    cultivar: 'Albo Borsigiana',
    kind: 'plant',
    status: 'active',
    favorite: true,
    vendor: 'North Shore Tropicals',
    purchaseDate: new Date('2023-04-15T12:00:00.000Z'),
    spaceId: 'space-conservatory',
    notes: 'Strong sectoral variegation with balanced new growth.',
    waterIntervalDays: 8,
    fertilizerIntervalDays: 28,
    mounted: false,
    mossPole: true,
    careNotes: 'Rotate quarterly and keep the moss pole lightly damp.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-burle-marx-flame',
    nickname: 'Flame',
    scientificName: 'Monstera dilacerata',
    commonName: 'Monstera burle marx flame',
    cultivar: 'Burle Marx Flame',
    kind: 'plant',
    status: 'active',
    favorite: true,
    vendor: 'Rare Roots Nursery',
    purchaseDate: new Date('2024-02-08T12:00:00.000Z'),
    spaceId: 'space-conservatory',
    notes: 'Juvenile specimen beginning to develop mature fenestration.',
    waterIntervalDays: 7,
    fertilizerIntervalDays: 21,
    mounted: false,
    mossPole: true,
    careNotes: 'Bright indirect light encourages mature leaf development.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-hoya-ets-10',
    nickname: 'Silver Trail',
    scientificName: 'Hoya sp. ETS-10',
    commonName: 'Hoya ETS-10 Splash',
    cultivar: 'Splash',
    kind: 'plant',
    status: 'active',
    favorite: false,
    purchaseDate: new Date('2024-06-21T12:00:00.000Z'),
    spaceId: 'space-study',
    notes: 'Silver-splashed foliage; actively trailing.',
    waterIntervalDays: 10,
    fertilizerIntervalDays: 30,
    mounted: false,
    mossPole: false,
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-hoya-gunung-gading',
    nickname: 'Gading',
    scientificName: 'Hoya sp. Gunung Gading',
    commonName: 'Hoya Gunung Gading',
    kind: 'plant',
    status: 'active',
    favorite: false,
    vendor: 'Canopy Exotics',
    purchaseDate: new Date('2025-01-18T12:00:00.000Z'),
    spaceId: 'space-study',
    notes: 'Monitoring new leaves while humidity is adjusted.',
    waterIntervalDays: 9,
    fertilizerIntervalDays: 30,
    mounted: true,
    mossPole: false,
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-african-violet',
    nickname: 'Violet',
    scientificName: 'Streptocarpus ionanthus',
    commonName: 'African Violet',
    cultivar: 'Optimara EverGrace',
    kind: 'plant',
    status: 'active',
    favorite: false,
    purchaseDate: new Date('2025-05-03T12:00:00.000Z'),
    spaceId: 'space-study',
    notes: 'Compact rosette with deep violet blooms.',
    waterIntervalDays: 5,
    fertilizerIntervalDays: 14,
    mounted: false,
    mossPole: false,
    careNotes: 'Bottom-water with room-temperature water; keep the crown dry.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-panther-chameleon',
    nickname: 'Mango',
    scientificName: 'Furcifer pardalis',
    commonName: 'Panther Chameleon',
    kind: 'animal',
    status: 'active',
    favorite: true,
    purchaseDate: new Date('2024-09-12T12:00:00.000Z'),
    spaceId: 'space-vivarium',
    notes:
      'Ambilobe locale; habitat and health tracked with the living collection.',
    waterIntervalDays: 1,
    fertilizerIntervalDays: 0,
    mounted: false,
    mossPole: false,
    careNotes: 'Mist habitat twice daily and record basking temperature.',
    createdAt,
    updatedAt,
  },
]

const tasks: Task[] = [
  {
    id: 'task-hoya-check',
    plantId: 'plant-hoya-gunung-gading',
    title: 'Check Hoya humidity and new growth',
    dueAt: new Date('2026-07-18T14:30:00.000Z'),
    priority: 'high',
    status: 'open',
    type: 'inspect',
    recurrence: 'none',
    createdAt,
    updatedAt,
  },
  {
    id: 'task-monstera-photo',
    plantId: 'plant-monstera-albo',
    title: 'Photograph the newest Monstera leaf',
    dueAt: new Date('2026-07-18T18:00:00.000Z'),
    priority: 'normal',
    status: 'open',
    type: 'photograph',
    recurrence: 'none',
    createdAt,
    updatedAt,
  },
  {
    id: 'task-vivarium-log',
    plantId: 'plant-panther-chameleon',
    title: 'Record vivarium temperature range',
    priority: 'low',
    status: 'completed',
    type: 'inspect',
    recurrence: 'none',
    completedAt: new Date('2026-07-18T13:15:00.000Z'),
    createdAt,
    updatedAt,
  },
]

const timeline: TimelineEvent[] = [
  {
    id: 'event-violet-bloom',
    plantId: 'plant-african-violet',
    title: 'African Violet opened three new blooms',
    description: 'First bloom cycle of the summer.',
    eventType: 'growth',
    occurredAt: new Date('2026-07-18T12:10:00.000Z'),
    createdAt,
    updatedAt,
  },
  {
    id: 'event-hoya-moved',
    plantId: 'plant-hoya-ets-10',
    title: 'Hoya ETS-10 moved to the North Study',
    eventType: 'moved',
    occurredAt: new Date('2026-07-17T16:00:00.000Z'),
    createdAt,
    updatedAt,
  },
  {
    id: 'event-monstera-leaf',
    plantId: 'plant-burle-marx-flame',
    title: 'New fenestrated leaf documented',
    eventType: 'growth',
    occurredAt: new Date('2026-07-15T11:30:00.000Z'),
    createdAt,
    updatedAt,
  },
]

let seedPromise: Promise<void> | undefined

export function ensureSeedData(): Promise<void> {
  seedPromise ??= db.transaction(
    'rw',
    db.plants,
    db.timeline,
    db.tasks,
    db.spaces,
    db.media,
    async () => {
      const [plantCount, timelineCount, taskCount, spaceCount] =
        await Promise.all([
          db.plants.count(),
          db.timeline.count(),
          db.tasks.count(),
          db.spaces.count(),
        ])

      if (spaceCount === 0) await db.spaces.bulkAdd(spaces)
      if (plantCount === 0) await db.plants.bulkAdd(plants)
      if (taskCount === 0) await db.tasks.bulkAdd(tasks)
      if (timelineCount === 0) await db.timeline.bulkAdd(timeline)
    },
  )

  return seedPromise
}
