# Lidl regular-price pilot — 2026-10-04 (research only)

## Source finding
Lidl's official Scan & Go instructions: https://www.lidl.fi/c/scan-go/s10080370
- Select the actual store via entrance QR or GPS; Scan & Go shows product and running basket prices.
- Scan packaged-product EAN, Paistopiste shelf-label barcode, and weighed-goods scale code.
- Lidl Plus coupons and offers may affect the basket. Official terms explicitly say app prices can differ from in-store displayed prices; the displayed store price prevails:
  https://www.lidl.fi/c/osallistumisehdot-lidl-plus/s10021544
- Lidl Plus privacy notice describes store-specific price data loaded to the device, but this is **not** permission to extract the app's internal APIs or reuse them commercially:
  https://www.lidl.fi/c/tietosuojaseloste-lidl-plus/s10021555

## First consented, manual observation (do not invent records)
For each product record: lidlProductId (when independently matched), name, brand, packSize, physicalStoreName, physicalStoreAddress, shelfPriceEur, shelfPriceBasis (unit/kg/l/multibuy), shelfObservedAt ISO with timezone, shelfPhotoReference, scannedEan (only if packaging verified), scanGoDisplayedPriceEur (optional), scanGoPriceBasis, isLidlPlus, isPromotion, receiptUnitPriceEur (optional), receiptTimestamp (optional), receiptEvidenceReference (optional), permissionToUseEvidence. Strip personal/payment details from any receipt.

Recommended sample: 5 Paistopiste (shelf barcode), 5 packaged dairy, 5 dry goods, 5 meat/fish or frozen, 5 fruit/vegetables (explicit per-kg). Aim to compare shelf vs Scan & Go and receipt on the *same date, same store and same unit basis*. A shelf observation alone is an observation, not checkout-verified normal price.

## Admission gate
Only import into `scripts/lib/lidl-verified-price-import.mjs` when an independently verified record has the correct store, actual regular checkout price, valid observedAt/validThrough, a traceable permitted source and nonempty evidenceReference. Historical Lidl website cards, Scan & Go display alone, crossed-out reference, Lidl Plus and bundle prices remain non-comparable. Do not collect via reverse engineering or internal API automation.

## Status
Verified October regular-price rows collected by this pilot: **0**. No checkout evidence or licensed direct feed has yet been supplied. No production price changes.
