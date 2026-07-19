import type { MediaAsset, Plant, Space, Task, TimelineEvent } from '../models'
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
    commonName: 'Monstera albo',
    scientificName: 'Monstera deliciosa',
    cultivar: 'Albo Borsigiana',
    kind: 'plant',
    status: 'thriving',
    acquiredAt: new Date('2023-04-15T12:00:00.000Z'),
    spaceId: 'space-conservatory',
    notes: 'Strong sectoral variegation with balanced new growth.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-burle-marx-flame',
    commonName: 'Monstera burle marx flame',
    scientificName: 'Monstera dilacerata',
    cultivar: 'Burle Marx Flame',
    kind: 'plant',
    status: 'stable',
    acquiredAt: new Date('2024-02-08T12:00:00.000Z'),
    spaceId: 'space-conservatory',
    notes: 'Juvenile specimen beginning to develop mature fenestration.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-hoya-ets-10',
    commonName: 'Hoya ETS-10 Splash',
    scientificName: 'Hoya sp. ETS-10',
    cultivar: 'Splash',
    kind: 'plant',
    status: 'thriving',
    acquiredAt: new Date('2024-06-21T12:00:00.000Z'),
    spaceId: 'space-study',
    notes: 'Silver-splashed foliage; actively trailing.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-hoya-gunung-gading',
    commonName: 'Hoya Gunung Gading',
    scientificName: 'Hoya sp. Gunung Gading',
    kind: 'plant',
    status: 'attention',
    acquiredAt: new Date('2025-01-18T12:00:00.000Z'),
    spaceId: 'space-study',
    notes: 'Monitoring new leaves while humidity is adjusted.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-african-violet',
    commonName: 'African Violet',
    scientificName: 'Streptocarpus ionanthus',
    cultivar: 'Optimara EverGrace',
    kind: 'plant',
    status: 'thriving',
    acquiredAt: new Date('2025-05-03T12:00:00.000Z'),
    spaceId: 'space-study',
    notes: 'Compact rosette with deep violet blooms.',
    createdAt,
    updatedAt,
  },
  {
    id: 'plant-panther-chameleon',
    commonName: 'Panther Chameleon',
    scientificName: 'Furcifer pardalis',
    kind: 'animal',
    status: 'thriving',
    acquiredAt: new Date('2024-09-12T12:00:00.000Z'),
    spaceId: 'space-vivarium',
    notes:
      'Ambilobe locale; habitat and health tracked with the living collection.',
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
    status: 'todo',
    createdAt,
    updatedAt,
  },
  {
    id: 'task-monstera-photo',
    plantId: 'plant-monstera-albo',
    title: 'Photograph the newest Monstera leaf',
    dueAt: new Date('2026-07-18T18:00:00.000Z'),
    priority: 'medium',
    status: 'in-progress',
    createdAt,
    updatedAt,
  },
  {
    id: 'task-vivarium-log',
    plantId: 'plant-panther-chameleon',
    title: 'Record vivarium temperature range',
    priority: 'low',
    status: 'completed',
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

const media: MediaAsset[] = [
  {
    id: 'media-monstera-study',
    plantId: 'plant-monstera-albo',
    name: 'Monstera albo leaf study',
    type: 'image',
    mimeType: 'image/jpeg',
    url: '/media/monstera-albo-leaf.jpg',
    capturedAt: new Date('2026-07-10T15:00:00.000Z'),
    altText: 'Variegated leaf of a Monstera albo',
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
      const [plantCount, timelineCount, taskCount, spaceCount, mediaCount] =
        await Promise.all([
          db.plants.count(),
          db.timeline.count(),
          db.tasks.count(),
          db.spaces.count(),
          db.media.count(),
        ])

      if (spaceCount === 0) await db.spaces.bulkAdd(spaces)
      if (plantCount === 0) await db.plants.bulkAdd(plants)
      if (taskCount === 0) await db.tasks.bulkAdd(tasks)
      if (timelineCount === 0) await db.timeline.bulkAdd(timeline)
      if (mediaCount === 0) await db.media.bulkAdd(media)
    },
  )

  return seedPromise
}
