# Ziiply beta access integration — test branch

## Existing implementation
- Beta email challenge verification creates a Neon-backed session and an HttpOnly cookie.
- `/api/beta/login/session` validates token hash, session expiry, revocation, disabled user and application status.
- Current accepted application statuses: `invited`, `active`. Product owner must confirm whether invitation alone should authorize app access.
- Beta welcome page is protected client-side only. This does **not** protect the main application.
- `beta.ziiply.fi` and `ziiply.vercel.app` are different cookie sites. A beta cookie issued on the first must not be assumed available on the second.
- The separate guide app uses its own authentication and its desktop guide is available via `/ohje/sisalto?versio=desktop`.

## Security requirements before deployment
1. Choose one canonical app origin under `ziiply.fi` (prefer a beta-specific same-origin app route or subdomain) and make beta authentication available there without transferring a bearer token in a URL.
2. Enforce access on the server before serving protected pages **and** all sensitive API routes. Never rely on client-side redirects alone.
3. Validate sessions against Neon, including expiration, revocation and application status. Deny on database errors (fail closed).
4. Exempt only the beta registration, login, email verification and required static assets from authentication.
5. Keep `ziiply.vercel.app` outside public beta access until its exposure is explicitly addressed. Domain aliases and direct preview URLs need independent testing.
6. Do not change the separate `ziiply-1bz3` Control Center project or Arvo health features.
7. Integrate guide sign-on only after the primary application access boundary is working; the guide currently has an independent session.

## Verification checklist
- Anonymous browser: app and protected APIs denied, login and signup remain reachable.
- Approved tester: passwordless email login works; app and APIs work.
- Pending/rejected/disabled tester: access denied.
- Revoked/expired session: access denied on next request.
- Direct API access, alternate hostnames, preview domains and browser refresh cannot bypass protection.
- Mobile and desktop routes retain matching functionality.
- Automated tests and Vercel preview deployment pass before any production merge.

**Status:** Design and source audit only. No production enforcement or authentication integration is claimed.
