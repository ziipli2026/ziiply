cat > src/app/components/PostHogProvider.tsx <<'EOF'
'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init('phc_yUGdeyjeZABknZazoazcsLfBhDwuZ8NBTDxXUxN2EweJ', {
      api_host: 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
EOF
