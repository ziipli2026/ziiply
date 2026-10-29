# Arvo Health native bridge integration checklist

The current native reader source files are reference implementations, NOT yet included in a buildable iOS/Android application. Do not claim a device connection is ready.

## Explicit local consent
1. Display versioned privacy information and category-specific toggles in the native host.
2. Record explicit in-app consent before any HealthKit or Health Connect read request.
3. Request only corresponding OS permissions; OS authorization alone is not in-app consent.
4. If consent is revoked, stop queries immediately and clear all locally held health records.
5. Never transmit health data to the Ziiply server, analytics, crash reports or localStorage.

## Integration
- iOS: include native/ios/ArvoHealthKitReader.swift in the Xcode app target and enable HealthKit capability and usage description.
- Android: add native/android/ArvoHealthConnectReader.kt to the app module with the appropriate Health Connect dependency, permissions, permission rationale and manifest declarations.
- Do not post health data to a generic WebView message event. Use an authenticated origin-bound native bridge with explicit invocation, schema checks, and selected-category minimization.
- The JS validation helper in src/lib/arvoHealthNativeBridge.mjs is not a security boundary on its own; consent and OS permissions must be enforced in native code before reading.
- HealthKit sleep records may overlap across sources and sleep sessions; deduplicate by source/sample interval and normalize before totals.
- On Android, HRV and sleep stages are not yet implemented; confirm device/API support for each metric.
- Verify platform timezone, DST boundaries, permission revocation, missing values, and cross-midnight sleep.

## Acceptance tests before deployment
- No read before consent; denied permission yields no reading.
- Unselected categories never queried or delivered.
- Data remains on device, never appears in server requests or browser storage.
- Day/week/month charts show accurate non-overlapping totals.
- Real-device test on iPhone and Android, build/CI passes.
