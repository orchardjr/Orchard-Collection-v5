import {
  safeCloudError,
  type SafeCloudError,
} from '../../data/collectionReadDiagnostics'

function errorChain(error?: SafeCloudError) {
  const chain: SafeCloudError[] = []
  let current = error
  while (current) {
    chain.push(current)
    current = current.cause
  }
  return chain
}

function combinedDetails(chain: SafeCloudError[]) {
  return chain
    .flatMap(({ message, details, hint }) => [message, details, hint])
    .filter(Boolean)
    .join(' ')
}

export function describeLabelDataError(
  error: unknown,
  source: 'templates' | 'nfc-tags',
) {
  const chain = errorChain(safeCloudError(error))
  const combined = combinedDetails(chain)
  const sourceLabel =
    source === 'templates' ? 'label template' : 'NFC tag label'

  if (
    chain.some(({ code }) => code === 'PGRST205') ||
    /table ['"]?public\.label_templates|relation ['"]?public\.label_templates/i.test(
      combined,
    )
  )
    return 'The production database is missing the label_templates table. Apply the Label Studio SQL setup.'

  if (
    chain.some(({ code }) => code === 'PGRST202') ||
    /could not find the function public\./i.test(combined)
  ) {
    const rpc = combined.match(/public\.([a-z][a-z0-9_]*)/i)?.[1]
    return `The production database is missing the ${rpc ?? 'required Label Studio'} RPC.`
  }

  const column = combined.match(
    /column (?:public\.)?label_templates\.?["']?([a-z_]+)["']? does not exist/i,
  )?.[1]
  if (column)
    return `The production label_templates table is missing the ${column} column. Apply the latest Label Studio SQL setup.`

  if (
    chain.some(
      ({ status, code }) =>
        status === 401 ||
        status === 403 ||
        code === '42501' ||
        code === 'PGRST301',
    )
  )
    return `Permission to read ${sourceLabel} data was denied. Verify authenticated grants and owner-scoped RLS policies.`

  const concrete = chain.find(
    ({ message }) =>
      message &&
      !/^Cloud read failed\. Check your connection and retry\.$/.test(message),
  )
  const detail =
    concrete?.message ??
    (error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : undefined)
  const identity = [concrete?.name, concrete?.code].filter(Boolean).join(' / ')
  return `${sourceLabel[0]!.toUpperCase()}${sourceLabel.slice(1)} data could not be loaded${identity ? ` (${identity})` : ''}${detail ? `: ${detail}` : '.'}`
}
