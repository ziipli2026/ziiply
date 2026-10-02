# Tokmanni / SPAR EAN visibility contract (audit only)

This is a proposed integration contract, **not** an active production filter.

## Independent fields

Keep EAN identity and classification separate. Do not overwrite existing `category` with audit guesses.

- `productClass`: `daily` | `department_store` | `review`.
- `classificationStatus`: `approved` | `proposed` | `unclassified`.
- `classificationEvidence`: existing verified Ziiply category, provider category, or name-based suggestion.
- `suggestedCategory`: never interpreted as approved without explicit review.
- `source`: preserve historical source and discovery provenance.

## Intended search behavior after explicit approval

| Class and status | Grocery search | Barcode lookup | Storage |
| --- | --- | --- | --- |
| daily + approved | Include | Recognize | Retain |
| daily + proposed | Exclude pending approval | Recognize without grocery price guarantee | Retain |
| department_store + approved | Exclude | Recognize | Retain |
| department_store + proposed | Exclude pending approval | Recognize | Retain |
| review / unclassified | Exclude pending review | Recognize if known | Retain |

**Important:** This rule applies to the proposed classified EAN index, not a blanket rejection of live Klevu results with no audited match. Before activating it, decide and test the behavior of newly discovered products so normal search does not silently lose products.

## Release gates

1. Sample false positives and false negatives in all three classes.
2. Confirm approved-category provenance; historical `Muut` is not approval.
3. Ensure every original EAN is retained, no duplicate EANs and no writes in audit.
4. Test Justiina normal prices, Gösta offers, scanner known/unknown and basket comparison separately.
5. Review the migration and rollback plan; require explicit approval before Neon writes, production wiring, merge or deploy.

Current route `src/app/api/tokmanni/products/route.ts` fetches Klevu with HTML fallback and asynchronously observes EANs. It does **not** currently enforce this proposed classification. Do not claim production filtering is active.

## Reviewed EAN index generation

Run `node scripts/tokmanni-spar-approved-index.mjs <merged-audit.json> <reviewed-approvals.json>` after human review. The approval JSON contains `items` with `ean`, `productClass`, `classificationStatus: "approved"`, `ziiplyCategory` for daily products, and `classificationEvidence`. Output is a deterministic, read-only `tokmanni-spar-approved-index.json`. Unknown/review/proposed EANs cannot silently become approved. Do not write the generated index to Neon or activate it in production until explicitly authorized. A query-specific relevance filter remains separate from persistent EAN classification.
