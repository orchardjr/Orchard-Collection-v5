const ORCHARD_HOST = 'app.orchardcollection.ca'

function supportedPath(pathname: string) {
  return (
    /^\/collection\/[^/]+$/.test(pathname) ||
    /^\/nfc\/[^/]+$/.test(pathname) ||
    /^\/feeders\/(?:colonies|crickets|inventory)\/[^/]+$/.test(pathname)
  )
}

export function resolveScanRoute(value: string, currentOrigin: string) {
  const input = value.trim()
  if (!input) return undefined

  try {
    const url = new URL(input, currentOrigin)
    const currentHost = new URL(currentOrigin).host
    if (
      url.host !== currentHost &&
      url.host !== ORCHARD_HOST &&
      url.host !== `www.${ORCHARD_HOST}`
    )
      return undefined

    return supportedPath(url.pathname) ? url.pathname : undefined
  } catch {
    return undefined
  }
}
