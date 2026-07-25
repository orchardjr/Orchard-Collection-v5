import { Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { nfcTagService } from '../services/NfcTagService'

type ResolutionState = 'loading' | 'invalid' | 'error'
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function NfcResolvePage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [resolution, setResolution] = useState<{
    token: string
    state: ResolutionState
  }>({ token, state: 'loading' })
  const validToken = uuidPattern.test(token)
  const state = !validToken
    ? 'invalid'
    : resolution.token === token
      ? resolution.state
      : 'loading'

  useEffect(() => {
    let active = true
    if (!validToken) return
    void nfcTagService
      .resolvePublicToken(token)
      .then((result) => {
        if (!active) return
        if (!result || result.resourceType !== 'plant') {
          setResolution({ token, state: 'invalid' })
          return
        }
        navigate(`/collection/${result.resourceId}`, { replace: true })
      })
      .catch(() => {
        if (active) setResolution({ token, state: 'error' })
      })
    return () => {
      active = false
    }
  }, [navigate, token, validToken])

  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <Card className="w-full max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Radio size={24} aria-hidden="true" />
        </span>
        {state === 'loading' ? (
          <>
            <h1 className="mt-5 font-display text-3xl font-semibold">
              Opening Orchard Collection…
            </h1>
            <p className="mt-3 text-muted-foreground">
              Resolving this NFC tag securely.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-3xl font-semibold">
              {state === 'invalid'
                ? 'NFC tag not recognized'
                : 'NFC tag could not be opened'}
            </h1>
            <p className="mt-3 leading-6 text-muted-foreground">
              {state === 'invalid'
                ? 'This tag is invalid, unassigned, or has been replaced.'
                : 'Check your connection and try scanning the tag again.'}
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Link
              to="/"
              className="mt-4 block text-sm font-semibold text-accent"
            >
              Open Orchard Collection
            </Link>
          </>
        )}
      </Card>
    </main>
  )
}
