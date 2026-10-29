# Android Health Connect integration gate

The Kotlin sources in this folder are **reference implementation**, not a compiled Android application. Do not ship until a host Android project exists and all checks below pass.

## Host integration

1. Use Android Health Connect SDK compatible with the project's minSdk/targetSdk. Declare only required READ permissions in AndroidManifest.xml: STEPS, ACTIVE_CALORIES_BURNED, RESTING_HEART_RATE, HEART_RATE_VARIABILITY_RMSSD, SLEEP. Follow Android's current Health Connect permissions and rationale activity requirements.
2. Check Health Connect availability before constructing ArvoHealthConnectReader. Handle unavailable / update-required states without reading.
3. Show a versioned, complete privacy notice in native UI. All five categories default off. Require an explicit affirmative action. Keep evidence of notice version, categories, and time in an auditable consent mechanism **before** requesting OS permissions. Do not infer consent from OS permission alone.
4. Request only permissions for categories explicitly approved in Arvo UI. Call setLocalConsent only after the recorded consent event and OS permission result.
5. Before each read, reconcileSystemPermissions. If the user withdraws consent, call revokeLocalConsent and clear all in-memory health readings and displayed charts immediately.
6. Deliver summaries through an origin-authenticated native-to-web bridge, not arbitrary browser CustomEvents. Never put readings in localStorage, URLs, logs, analytics, or network calls.
7. Keep HRV RMSSD distinct from Apple Health SDNN. Treat missing stages as missing data, not zero minutes.

## Verification before release

- Compile the reader against a pinned Health Connect SDK version in a real Android Gradle project.
- Run Kotlin unit tests for overlapping and cross-midnight sleep stages.
- Instrument permission grant, partial grant, revocation during a session, no Health Connect provider, and process restart.
- Check that health data is never exposed to ordinary web scripts without authenticated native origin and explicit category consent.
- Confirm the complete consent notice and withdrawal UX on a physical device.
- Run the JS contract and bridge tests in GitHub Actions and record passing run links.

No release or real-device success is claimed by this document.
