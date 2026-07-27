import { describe, expect, it } from 'vitest'

import { describeLabelDataError } from './labelDataError'

describe('describeLabelDataError', () => {
  it('identifies a missing Label Studio table', () => {
    expect(
      describeLabelDataError(
        {
          code: 'PGRST205',
          message:
            "Could not find the table 'public.label_templates' in the schema cache",
        },
        'templates',
      ),
    ).toContain('missing the label_templates table')
  })

  it('identifies a missing RPC', () => {
    expect(
      describeLabelDataError(
        {
          code: 'PGRST202',
          message: 'Could not find the function public.render_label_batch',
        },
        'templates',
      ),
    ).toContain('missing the render_label_batch RPC')
  })

  it('identifies RLS or permission denial', () => {
    expect(
      describeLabelDataError(
        { status: 403, code: '42501', message: 'permission denied' },
        'templates',
      ),
    ).toContain('Permission to read label template data was denied')
  })

  it('identifies a missing column', () => {
    expect(
      describeLabelDataError(
        {
          code: '42703',
          message: 'column label_templates.qr_size_in does not exist',
        },
        'templates',
      ),
    ).toContain('missing the qr_size_in column')
  })

  it('preserves a Dexie failure', () => {
    const error = new Error('object store labelTemplates was not found')
    error.name = 'NotFoundError'
    expect(describeLabelDataError(error, 'templates')).toContain(
      'NotFoundError): object store labelTemplates was not found',
    )
  })
})
