# Five restricted EAN identity cases — 31 October 2026

The initial 31-query set sampled older catalogue names. A missing expected EAN
does not prove that the current product satisfies every requested attribute.
No query or expected EAN is removed from the audit.

## Corrections supported by primary evidence

- **2000436800005 — Kirjolohifilee D ruodoton.** The current K-Citymarket 3221
  feed identifies a D-cut fillet. [K-Ruoka's product page](https://www.k-ruoka.fi/kauppa/tuote/kirjolohifilee-d-leikkuu-kg-2000436800005-k947)
  expressly names the boneless attribute. [Kalaneuvos's preparation guide](https://kalaneuvos.fi/kirjolohen-ja-lohen-leikkausasteet/)
  supports the general D-cut salmon-fillet attribute. Retrieval can omit the
  redundant word only when salmon fillet and D-cut remain explicit. Final
  qualification requires an actual D-cut preparation marker, rejects an
  explicit bone-in contradiction, and still enforces package size. No EAN,
  manufacturer or brand exception is added to the search policy.
- **2000604100005 — Kukkakaali irto.** The selected Prisma 292 and K-Citymarket
  3221 feeds both return the same product ID 108626, sold per kilogram.
  [The primary S-kaupat product page](https://www.s-kaupat.fi/tuote/kukkakaali-irto/2000604100005)
  expressly prints the loose-sale name and this EAN. The one-off recovery
  parses both from a fresh HTTP response when available. If the primary server
  rate-limits the runner, an explicit reviewed primary observation must also
  match an independent raw catalogue artifact less than 24 hours old; the
  report names this archival method and preserves the original 429 statuses.
  Both methods require the current fresh-produce
  taxonomy and an otherwise identical name, and records the response hash and
  before/after aliases. It cannot add a producer, origin or different package.

## Cases that remain unverified or conflicting

| EAN | Requested identity | Fresh selected-store evidence | Outcome |
|---|---|---|---|
| 2000410100008 | Tuore Kokonainen Lohi | No exact current selected-store product was returned by broad and EAN probes. The generic catalogue name does not prove freshness or whole-fish preparation. | Keep the requested attributes mandatory; current match unverified. |
| 2387966000007 | Hätälä C-cut, approximately 700 g | K-Citymarket 3221 product 22140 explicitly names approximately 1 kg. The primary S-kaupat 700 g page has the same restricted code but states it is outside the selected assortment. | Do not use the other chain's 700 g identity to qualify the 1 kg row. |
| 2000629900000 | Kurkku Härkälä | K-Citymarket 3221 currently names a generic packaged Finnish cucumber; other observations mention different producers. | Producer Härkälä remains mandatory; no producer synonym is invented. |

Read-only store evidence: [run 41225696033](https://github.com/ziipli2026/ziiply/actions/runs/41225696033).
The store-specific observations retain provider, store ID, product ID, family
key and quote timestamps. The catalogue's single EAN key is insufficient to
assert an unobserved producer or package across these restricted identities.

## Verified outcome

[Run 41226860852](https://github.com/ziipli2026/ziiply/actions/runs/41226860852)
rechecked all 31 original queries: **28 expected EANs found, 3 not found**.
The cauliflower recovery used the explicitly reported archival method after
three HTTP 429 responses; no live HTTP success was claimed. The three remaining
cases above retain their full requested constraints. The language variation
`leikkuu` / `leikattu` is normalized independently of package size: the current
1 kg C-cut product qualifies for a 1 kg query and is still rejected for 700 g.
