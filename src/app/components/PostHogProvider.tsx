'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const INTERNAL_TEST_PARAM = 'ziiply_test'
const INTERNAL_TEST_STORAGE_KEY = 'ziiply_internal_test_user'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (posthog.__loaded) return

    const params = new URLSearchParams(window.location.search)
    const testParam = params.get(INTERNAL_TEST_PARAM)
    try {
      if (testParam === '1') window.localStorage.setItem(INTERNAL_TEST_STORAGE_KEY, '1')
      else if (testParam === '0') window.localStorage.removeItem(INTERNAL_TEST_STORAGE_KEY)
    } catch {
      // Storage can be unavailable in private browsing.
    }

    const isInternalTest = (() => {
      try { return window.localStorage.getItem(INTERNAL_TEST_STORAGE_KEY) === '1' }
      catch { return false }
    })()
    const isProduction = window.location.hostname === 'ziiply.fi' || window.location.hostname === 'www.ziiply.fi'
    const environment = isProduction ? 'production' : 'preview'
    posthog.init(
      'phc_yUGdeyjeZABknZazoazcsLfBhDwuZ8NBTDxXUxN2EweJ',
      {
        api_host: 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        before_send: (event) => {
          if (!event) return event
          // Prevent accidental leakage of URL query params (including login links),
          // health, nutrition and precise geolocation through event properties.
          const bannedKey = /(^|_)(email|token|secret|password|health|nutrition|meal|recipe|latitude|longitude|lat|lon|lng|gps|coordinate|url|href|referrer|pathname|search|query|ean|barcode|product_name)(_|$)/i
          const properties = Object.fromEntries(
            Object.entries(event.properties || {}).filter(([key]) =>
              key.startsWith('$')
                ? !/url|referrer|current_url|pathname|host|search|query/i.test(key)
                : (key === 'search_id' || key === 'search_kind' || !bannedKey.test(key))
            )
          )
          event.properties = {
            ...properties,
            ziiply_environment: environment,
            ziiply_internal_test: isInternalTest,
            ziiply_analytics_schema: 1,
          }
          return event
        },
      }
    )

    if (isInternalTest) posthog.setInternalOrTestUser()
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
