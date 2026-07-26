import { describe, expect, it } from 'vitest'

import { describeNfcDependencyError } from './nfcDependencyError'

describe('describeNfcDependencyError', () => {
  it('identifies a missing nfc_tags table through a wrapped error', () => {
    expect(
      describeNfcDependencyError(
        new Error('Cloud read failed', {
          cause: {
            code: 'PGRST205',
            message:
              "Could not find the table 'public.nfc_tags' in the schema cache",
          },
        }),
      ),
    ).toContain('missing the nfc_tags table')
  })

  it('names a missing NFC RPC', () => {
    expect(
      describeNfcDependencyError({
        code: 'PGRST202',
        message:
          'Could not find the function public.scan_nfc_tag(device, token)',
      }),
    ).toContain('missing the scan_nfc_tag RPC')
  })

  it('identifies permission failures', () => {
    expect(
      describeNfcDependencyError({
        status: 403,
        code: '42501',
        message: 'permission denied for table nfc_tags',
      }),
    ).toContain('Permission to read NFC tags was denied')
  })

  it('identifies a missing NFC column', () => {
    expect(
      describeNfcDependencyError({
        code: '42703',
        message: 'column nfc_tags.scan_count does not exist',
      }),
    ).toContain('missing the scan_count column')
  })

  it('preserves an actionable IndexedDB error', () => {
    const error = new Error(
      'Failed to execute transaction: object store nfcTags was not found',
    )
    error.name = 'NotFoundError'

    expect(describeNfcDependencyError(error)).toBe(
      'NFC tags could not be loaded (NotFoundError): Failed to execute transaction: object store nfcTags was not found',
    )
  })
})
