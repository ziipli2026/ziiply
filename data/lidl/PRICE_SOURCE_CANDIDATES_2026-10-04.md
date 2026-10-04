# Lidl normal-price acquisition candidates — 2026-10-04

## Current evidence
- Lidl official public Paistopiste catalog: product identities/images, but no complete current checkout-price feed. https://www.lidl.fi/h/paistopiste-leivaet-ja-leivonnaiset/h10096086
- Lidl first-party announcement dated 2026-04-20: seven historical regular-price changes. These cannot establish 2026-10-04 checkout prices. https://www.sttinfo.fi/tiedote/71968449/lidl-laskee-suosituimpien-paistopistetuotteiden-hintoja?lang=fi
- Alennuskartta says it tracks observed Lidl prices for 1,928 products during 2026-06-26 to 2026-10-01. Candidate for investigating coverage and data-access rights, **not** an approved store feed. https://alennuskartta.fi/alennuskoodit/lidl

## Acquisition gate
Before importing a third-party observation, establish permission to reuse data; identify exact product/GTIN, store scope, observation timestamp, promotion/Plus eligibility and checkout-price verification. Never infer normal price from a strikethrough/reference price or a bundle offer. Keep historical observations separate from `regularPriceEur`. Only `authorized-store-feed` or `verified-store-receipt` with the existing contract may become comparable.

## Next concrete source work
1. Seek authorized product-level normal-price access from Lidl or data provider.
2. Determine whether Alennuskartta exposes a licensed feed with store-specific timestamped observations and promotion flags; if not, retain as research lead only.
3. Collect verified current store receipts for a small Paistopiste validation sample; reconcile exact catalog IDs and images.
4. Do not deploy any research prices to production.
