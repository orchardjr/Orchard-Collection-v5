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

function matchingMessage(chain: SafeCloudError[], pattern: RegExp) {
  return chain
    .flatMap(({ message, details, hint }) => [message, details, hint])
    .find((value) => value && pattern.test(value))
}

export function describeNfcDependencyError(error: unknown) {
  const chain = errorChain(safeCloudError(error))
  const combined = chain
    .flatMap(({ message, details, hint }) => [message, details, hint])
    .filter(Boolean)
    .join(' ')

  if (
    chain.some(({ code }) => code === 'PGRST205') ||
    /table ['"]?public\.nfc_tags|relation ['"]?public\.nfc_tags/i.test(combined)
  )
    return 'The cloud database is missing the nfc_tags table. Apply the NFC Phase 1 migration to enable NFC tags.'

  if (
    chain.some(({ code }) => code === 'PGRST202') ||
    /could not find the function public\./i.test(combined)
  ) {
    const dependency = matchingMessage(
      chain,
      /public\.(scan_nfc_tag|record_nfc_scan|replace_nfc_tag)/i,
    )?.match(/public\.(scan_nfc_tag|record_nfc_scan|replace_nfc_tag)/i)?.[1]
    return `The cloud database is missing the ${dependency ?? 'required NFC'} RPC. Apply the NFC Phase 1 migration to restore it.`
  }

  const missingColumn = combined.match(
    /column (?:public\.)?nfc_tags\.?["']?([a-z_]+)["']? does not exist/i,
  )?.[1]
  if (missingColumn)
    return `The cloud nfc_tags table is missing the ${missingColumn} column. Apply the latest NFC migration.`

  if (
    chain.some(
      ({ status, code }) =>
        status === 401 ||
        status === 403 ||
        code === '42501' ||
        code === 'PGRST301',
    )
  )
    return 'Permission to read NFC tags was denied. Verify the nfc_tags RLS policies and authenticated grants.'

  const code = chain.find(({ code }) => code)?.code
  const status = chain.find(({ status }) => status !== undefined)?.status
  const suffix = [status ? `HTTP ${status}` : undefined, code]
    .filter(Boolean)
    .join(' / ')
  const concrete = chain.find(
    ({ message }) =>
      message &&
      !/^Cloud read failed\. Check your connection and retry\.$/.test(message),
  )
  const detail =
    concrete?.message ??
    (typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : undefined)
  const identity = [concrete?.name, suffix || undefined]
    .filter(Boolean)
    .join(' / ')
  return `NFC tags could not be loaded${identity ? ` (${identity})` : ''}${detail ? `: ${detail}` : '.'}`
}
