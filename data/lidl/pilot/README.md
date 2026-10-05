# Lidl receipt pilot batch input

Operator template only. Replace placeholders with real receipt-observation JSON before running the pilot batch.

Do not put receipt images, payment-card data, customer names, loyalty identifiers, or other personal data into this manifest. The observation JSON should contain only fields required by the existing pilot intake contract.

Run: node scripts/run-lidl-receipt-pilot-batch.mjs <batch.json>

The command is research-only and must remain research-only-not-published. It must not be used as a production price import path.
