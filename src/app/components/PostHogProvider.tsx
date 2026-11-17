'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const INTERNAL_TEST_PARAM = 'ziiply_test'
const INTERNAL_TEST_STORAGE_KEY = 'ziiply_internal_test_user'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Determine whether the provider is re-entering an already-loaded SDK.
    if (window.location.search.includes('ziiply_test=1') &&
        !['ziiply.fi', 'www.ziiply.fi', 'ziiply.vercel.app'].includes(window.location.hostname)) {
      console.info('[ziiply-ph-probe-entry]', JSON.stringify({
        loadedOnEffectEntry: Boolean(posthog.__loaded),
        optedOutOnEffectEntry: posthog.has_opted_out_capturing(),
      }))
    }
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
        api_host: '/ph-ingest',
        ui_host: 'https://eu.posthog.com',
        person_profiles: 'identified_only',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        before_send: (event) => {
          if (!event) return event
          if (typeof isProduction !== 'undefined' && typeof testParam !== 'undefined' && !isProduction && testParam === '1' && event.event === 'ziiply_posthog_transport_probe') {
            console.info('[ziiply-ph-probe-before-send]', JSON.stringify({reached: true}))
          }
          // Prevent accidental leakage of URL query params (including login links),
          // health, nutrition and precise geolocation through event properties.
          const bannedKey = /(^|_)(email|token|secret|password|health|nutrition|meal|recipe|latitude|longitude|lat|lon|lng|gps|coordinate|url|href|referrer|pathname|search|query|ean|barcode|product_name)(_|$)/i
          const properties = Object.fromEntries(
            Object.entries(event.properties || {}).filter(([key, value]) =>
              (value === null || typeof value !== 'object') && (key.startsWith('$')
                ? !/url|referrer|current_url|pathname|host|search|query/i.test(key)
                : (key === 'search_id' || key === 'search_kind' || key === 'search_type' || !bannedKey.test(key)))
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

    // Preview-only, explicitly requested CI diagnostic. Never run on production,
    // and never transmit searches, identifiers, user input or location.
    if (!isProduction && testParam === '1') {
      const probeResult = posthog.capture('ziiply_posthog_transport_probe', {
        ziiply_probe: 'preview_ci',
      }, { send_instantly: true })
      console.info('[ziiply-ph-probe-result]', JSON.stringify({
        captured: Boolean(probeResult),
      }))
      // No user content: local preview-only diagnostic of SDK capture state.
      console.info('[ziiply-ph-probe]', JSON.stringify({
        initialized: Boolean(posthog.__loaded),
        optedOut: posthog.has_opted_out_capturing(),
        distinctIdReady: typeof posthog.get_distinct_id() === 'string',
      }))
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
