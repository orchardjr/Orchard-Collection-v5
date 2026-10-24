import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { CollectionBackupCard } from './CollectionBackupCard'
import * as service from './collectionBackup'
vi.mock('./collectionBackup', () => ({
  readBackupTables: vi.fn(),
  scopeBackup: vi.fn(),
  plantsCsv: vi.fn(() => 'csv'),
  backupDocument: vi.fn(() => Promise.resolve('{}')),
  downloadBackup: vi.fn(),
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(service.readBackupTables).mockResolvedValue({
    local: false,
    tables: {} as service.BackupTables,
  })
  vi.mocked(service.scopeBackup).mockReturnValue({
    plants: [{ id: 'p' }],
    tasks: [],
    spaces: [],
    task_plants: [],
    plant_media: [],
    timeline_events: [],
    plant_properties: [],
    tags: [],
    plant_tag_links: [],
    nfc_tags: [],
    label_templates: [],
  } as service.BackupTables)
})
it('defaults to all and prepares a dated counted export', async () => {
  render(<CollectionBackupCard />)
  expect(screen.getByRole('combobox')).toHaveValue('all')
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  await waitFor(() =>
    expect(service.downloadBackup).toHaveBeenCalledWith('csv', 'csv'),
  )
  expect(screen.getByRole('status')).toHaveTextContent('1 plants')
})
it('passes photo and scope choices to JSON generation', async () => {
  render(<CollectionBackupCard />)
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'archived' },
  })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }))
  await waitFor(() =>
    expect(service.backupDocument).toHaveBeenCalledWith(
      expect.anything(),
      false,
      'archived',
      true,
      expect.any(Function),
    ),
  )
})
it('does not download on read failure and allows retry', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(service.readBackupTables).mockRejectedValueOnce(
    new Error('Read failed'),
  )
  render(<CollectionBackupCard />)
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Read failed')
  expect(service.downloadBackup).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  vi.restoreAllMocks()
})
