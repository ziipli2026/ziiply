# Lidl 25-product store-price pilot (research only)

Generate the current balanced sample locally:

```sh
node scripts/generate-lidl-price-pilot-template.mjs ./lidl-pilot-local.csv\n\n# Optional store-prefilled form:\nnode scripts/generate-lidl-price-pilot-template.mjs ./lidl-pilot-local.csv FI0218 "Lidl Hyvinkää" "<verified store address>"
```

The generator takes five products from each of five grocery groups in the frozen v44 research catalog. Names and Lidl research IDs are *matching hints*, not confirmed physical SKU identities. Check packaging, size and identity at the selected Lidl store before entering observations.

## Manual observations

- Use one real physical Lidl store per intake; use the same agreed storeId for all accepted rows.
- `priceBasis=unit` only for now. Leave €/kg and €/l products unsubmitted until separate quantity conversion is supported.
- Record observed code + origin (packaging / paistopiste-shelf / scale-label); packaging EAN, Paistopiste shelf code and scale-label code as distinct evidence. None becomes a verified EAN merely because it looks numeric.
- Enter shelf price and a receipt **unit** price only for an ordinary purchase. Set `isLidlPlus=false`, `isPromotion=false`, `isMultiBuy=false` only after actually confirming all three; otherwise leave blank, which causes rejection.
- `permissionToUseEvidence=true` only when permission really exists. Provide an evidence reference, not a receipt photo, personal/payment information, or customer identifiers.
- `receiptTimestamp` must be a full timezone-qualified ISO timestamp. A receipt documents the checkout price at that observation time; Ziiply applies its own freshness policy separately and does not ask you to invent a future validity period.
- Do not put completed CSVs, receipts, card details, or customer data in GitHub.

Check the local file:

```sh
node scripts/run-lidl-pilot-intake.mjs ./lidl-pilot-local.csv STORE_ID
```

The command prints counts and rejection reasons only, not prices or receipt references. `structurallyAcceptedCandidateCount` means that claimed fields passed software validation, **not** that a person independently checked the receipt or permission. `externallyVerifiedEvidenceCount` and `publishablePriceCount` remain zero. Publishing requires separate authorization, authenticity review, SKU/store matching and freshness assessment. The preview API and production are not connected to this CLI.


## Import after evidence review

After the completed local CSV has been reviewed and every accepted row really has reusable receipt evidence, import it to a local/test bank with:

```sh
node scripts/import-lidl-pilot-receipts-to-bank.mjs ./lidl-pilot-local.csv FI0218
```

The import is all-or-nothing for validation failures: an unknown product, wrong store, promotional/Plus/multi-buy row, missing permission/evidence, stale receipt or other rejected row aborts before the bank is written. The selected store ID must match every accepted receipt row. Keep the raw CSV and receipt material outside Git.
