import '@testing-library/jest-dom/vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MediaImporter } from './MediaImporter'
import type { MediaImportResult } from '../../services/MediaService'
const file = (name: string, type = 'image/jpeg') =>
  new File(['photo'], name, { type })
const choose = (files: File[]) =>
  fireEvent.change(screen.getByLabelText('Choose photos'), {
    target: { files },
  })
describe('photo capture and upload queue', () => {
  it('saves sequentially, keeps duplicate filenames distinct and retries only failed files', async () => {
    const first = file('same.jpg'),
      second = file('same.jpg'),
      third = file('third.jpg')
    const onImport = vi
      .fn()
      .mockResolvedValueOnce([{ fileName: first.name, success: true }])
      .mockResolvedValueOnce([
        { fileName: second.name, success: false, error: '[503] unavailable' },
      ])
      .mockResolvedValueOnce([{ fileName: third.name, success: true }])
      .mockResolvedValueOnce([{ fileName: second.name, success: true }])
    render(<MediaImporter onImport={onImport} />)
    choose([first, second, third])
    await screen.findByText('2 saved · 1 failed · 0 remaining')
    expect(
      within(screen.getByLabelText('Photo upload queue')).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(3)
    expect(screen.getByRole('alert')).toHaveTextContent('[503]')
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed photos' }))
    await screen.findByText('3 saved · 0 failed · 0 remaining')
    expect(onImport.mock.calls.map(([files]) => files[0])).toEqual([
      first,
      second,
      third,
      second,
    ])
    expect(
      screen.queryByRole('button', { name: 'Retry failed photos' }),
    ).not.toBeInTheDocument()
  })
  it('blocks overlapping input/drop/paste while busy and resumes after an unexpected error', async () => {
    let resolve!: (results: MediaImportResult[]) => void
    const onImport = vi
      .fn()
      .mockReturnValueOnce(
        new Promise<MediaImportResult[]>((done) => {
          resolve = done
        }),
      )
      .mockRejectedValueOnce(new Error('network unavailable'))
    render(<MediaImporter onImport={onImport} />)
    choose([file('first.jpg'), file('second.jpg')])
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeDisabled()
    expect(
      screen.getByRole('progressbar', { name: 'Photos processed' }),
    ).toHaveAttribute('value', '0')
    const area = screen.getByLabelText(
      'Photo upload area. Drop files or paste an image.',
    )
    fireEvent.drop(area, { dataTransfer: { files: [file('ignored.jpg')] } })
    fireEvent.paste(area, {
      clipboardData: {
        items: [{ kind: 'file', getAsFile: () => file('ignored.jpg') }],
      },
    })
    expect(onImport).toHaveBeenCalledTimes(1)
    await act(async () => resolve([{ fileName: 'first.jpg', success: true }]))
    await screen.findByText('1 saved · 1 failed · 0 remaining')
    expect(onImport).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('alert')).toHaveTextContent('network unavailable')
  })
  it('supports camera capture and resets the file input for another capture', async () => {
    const onImport = vi
      .fn()
      .mockResolvedValue([{ fileName: 'camera.jpg', success: true }])
    render(<MediaImporter onImport={onImport} />)
    const camera = screen.getByLabelText('Camera photo')
    expect(camera).toHaveAttribute('capture', 'environment')
    expect(screen.getByLabelText('Choose photos')).toHaveAttribute('multiple')
    fireEvent.change(camera, { target: { files: [file('camera.jpg')] } })
    await screen.findByText('1 saved · 0 failed · 0 remaining')
    expect(camera).toHaveValue('')
    fireEvent.change(camera, { target: { files: [file('camera.jpg')] } })
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(2))
  })
  it('rejects unsupported and oversized photos before upload while continuing valid files', async () => {
    const onImport = vi
      .fn()
      .mockResolvedValue([{ fileName: 'good.jpg', success: true }])
    const huge = file('huge.jpg')
    Object.defineProperty(huge, 'size', { value: 26 * 1024 * 1024 })
    render(<MediaImporter onImport={onImport} />)
    choose([file('unsupported.heic', 'image/heic'), huge, file('good.jpg')])
    await screen.findByText('1 saved · 2 failed · 0 remaining')
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Unsupported image format.')).toBeInTheDocument()
    expect(
      screen.getByText('The image exceeds the 25 MB limit.'),
    ).toBeInTheDocument()
  })
  it('keeps saved-with-warning files out of upload retries and clears only the UI list', async () => {
    const onImport = vi.fn().mockResolvedValue([
      {
        fileName: 'saved.jpg',
        success: true,
        warning: 'Photo saved, but timeline failed.',
      },
    ])
    render(<MediaImporter onImport={onImport} />)
    choose([file('saved.jpg')])
    await screen.findByText('Photo saved, but timeline failed.')
    expect(
      screen.queryByRole('button', { name: /Retry/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear upload list' }))
    expect(
      screen.queryByLabelText('Photo upload queue'),
    ).not.toBeInTheDocument()
    expect(onImport).toHaveBeenCalledTimes(1)
  })
  it('does not start queued files after leaving the tab', async () => {
    let resolve!: (results: MediaImportResult[]) => void
    const onImport = vi.fn().mockReturnValue(
      new Promise<MediaImportResult[]>((done) => {
        resolve = done
      }),
    )
    const { unmount } = render(<MediaImporter onImport={onImport} />)
    choose([file('first.jpg'), file('second.jpg')])
    unmount()
    await act(async () => resolve([{ fileName: 'first.jpg', success: true }]))
    expect(onImport).toHaveBeenCalledTimes(1)
  })
  it('honors disabled state for drag/drop as well as buttons', () => {
    const onImport = vi.fn()
    render(<MediaImporter disabled onImport={onImport} />)
    fireEvent.drop(
      screen.getByLabelText('Photo upload area. Drop files or paste an image.'),
      { dataTransfer: { files: [file('photo.jpg')] } },
    )
    expect(onImport).not.toHaveBeenCalled()
  })
})
