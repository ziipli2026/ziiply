# Lidl 25-product store-price pilot (research only)

Generate the current balanced sample locally:

```sh
node scripts/generate-lidl-price-pilot-template.mjs ./lidl-pilot-local.csv
```

The generator takes five products from each of five grocery groups in the frozen v44 research catalog. Names and Lidl research IDs are *matching hints*, not confirmed physical SKU identities. Check packaging, size and identity at the selected Lidl store before entering observations.

## Manual observations

- Use one real physical Lidl store per intake; use the same agreed storeId for all accepted rows.
- `priceBasis=unit` only for now. Leave €/kg and €/l products unsubmitted until separate quantity conversion is supported.
- Record observed code + origin (packaging / paistopiste-shelf / scale-label); packaging EAN, Paistopiste shelf code and scale-label code as distinct evidence. None becomes a verified EAN merely because it looks numeric.
- Enter shelf price and a receipt **unit** price only for an ordinary purchase. Set `isLidlPlus=false`, `isPromotion=false`, `isMultiBuy=false` only after actually confirming all three; otherwise leave blank, which causes rejection.
- `permissionToUseEvidence=true` only when permission really exists. Provide an evidence reference, not a receipt photo, personal/payment information, or customer identifiers.
- `receiptTimestamp` and `validThrough` must be full timezone-qualified ISO timestamps. Do not invent a validity period. A receipt documents an observed transaction, not a promise of a future shelf price.
- Do not put completed CSVs, receipts, card details, or customer data in GitHub.

Check the local file:

```sh
node scripts/run-lidl-pilot-intake.mjs ./lidl-pilot-local.csv STORE_ID
```

The command prints counts and rejection reasons only, not prices or receipt references. `structurallyAcceptedCandidateCount` means that claimed fields passed software validation, **not** that a person independently checked the receipt or permission. `externallyVerifiedEvidenceCount` and `publishablePriceCount` remain zero. Publishing requires separate authorization, authenticity review, SKU/store matching and freshness assessment. The preview API and production are not connected to this CLI.
