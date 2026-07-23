import { Card } from '../components/ui/Card'
import { Page } from '../components/ui/Page'
import { useUiStore, type ThemePreference } from '../stores/uiStore'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/authContext'

const themes: Array<{
  value: ThemePreference
  title: string
  description: string
}> = [
  {
    value: 'light',
    title: 'Light',
    description: 'A bright, paper-like workspace.',
  },
  {
    value: 'dark',
    title: 'Dark',
    description: 'A quiet workspace for low light.',
  },
  {
    value: 'system',
    title: 'System',
    description: 'Follow your device preference.',
  },
]

export function SettingsPage() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const auth = useAuth()

  return (
    <Page
      title="Settings"
      subtitle="Personalize how Orchard Collection works for you."
    >
      <Card
        title="Appearance"
        description="Choose how the application looks on this device."
        className="max-w-3xl"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`rounded-xl border p-4 text-left transition ${theme === option.value ? 'border-accent bg-accent-soft' : 'border-border bg-background hover:border-accent/50'}`}
            >
              <span className="text-sm font-semibold text-foreground">
                {option.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </Card>
      {auth.configured && (
        <Card
          title="Account"
          description={auth.user?.email ?? 'Your synchronized Orchard account.'}
          className="mt-5 max-w-3xl"
        >
          <Button variant="secondary" onClick={() => void auth.signOut()}>
            Log out
          </Button>
        </Card>
      )}
    </Page>
  )
}
