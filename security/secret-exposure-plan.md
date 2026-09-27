# Secret exposure simulation

Simulation only. No production secret or provider behavior is changed.

## Findings

- OPENAI_API_KEY is referenced through process.env in the server route.
- CRON_SECRET is referenced through process.env in the server route.
- A Tjek x-api-key value is hardcoded in etarjouslehdetProvider.ts.
- A Tjek x-api-key value is also present in a GitHub diagnostic workflow.
- The active offer source router currently has ENABLE_ETARJOUSLEHDET_PROVIDER_V28 = false and the disabled S-market eTarjouslehdet path returns no offers.

## Proposed production handling

1. Do not print or copy the current Tjek key into logs, tests, issues, or commits.
2. Before changing the provider, determine whether the Tjek key is intentionally public/client-distributed or a credential that must remain secret.
3. If it is secret:
   - rotate/revoke the exposed value first;
   - keep the replacement server-side only;
   - do not import a server secret into a client component/provider bundle;
   - remove/redact the key from active source and workflows;
   - treat Git history as permanently exposed unless history is separately rewritten.
4. If it is a documented public browser key:
   - do not mislabel it as a secret;
   - still avoid unnecessary duplication and logging;
   - preserve provider behavior.
5. No Tjek change is required to ship the other hardening patches because the active router currently disables the eTarjouslehdet provider.
