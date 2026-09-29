'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const INTERNAL_TEST_PARAM = 'ziiply_test'
const INTERNAL_TEST_STORAGE_KEY = 'ziiply_internal_test_user'

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    posthog.init(
      'phc_yUGdeyjeZABknZazoazcsLfBhDwuZ8NBTDxXUxN2EweJ',
      {
        api_host: 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
      }
    )

    // Opt this browser into PostHog's internal/test-user cohort.
    // Visiting ?ziiply_test=1 persists the marker for normal subsequent visits.
    // Visiting ?ziiply_test=0 removes the local marker.
    const params = new URLSearchParams(window.location.search)
    const testParam = params.get(INTERNAL_TEST_PARAM)

    if (testParam === '1') {
      window.localStorage.setItem(INTERNAL_TEST_STORAGE_KEY, '1')
    } else if (testParam === '0') {
      window.localStorage.removeItem(INTERNAL_TEST_STORAGE_KEY)
    }

    if (window.localStorage.getItem(INTERNAL_TEST_STORAGE_KEY) === '1') {
      posthog.setInternalOrTestUser()
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
