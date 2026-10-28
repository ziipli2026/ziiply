# Neon-first normal search: isolated simulation

Branch: test/neon-first-product-search
Base: desktop preview 72223bb0. Simulation route: /neon-search-simulation.

This first stage uses explicitly synthetic products, images, prices and timing. It does not query or write any database or provider. No existing scanner, mobile, desktop search or canonical alias is changed. The scanner's existing EAN identity model is the basis: EAN identifies a product, while price and availability belong to a physical store.

## Acceptance criteria covered here

- Publish known bank products before shop responses.
- Always run selected shop adapters, including when the bank is empty or fails.
- Merge only identical EANs, keep different packages separate and avoid name-only merging.
- Keep prices separate for S and K; never use a zero or missing price as a verified price.
- Preserve a known bank image; fill a missing image from shop data.
- Include products discovered only through shop search.
- Preserve usable results if one provider fails.
- Cancelled requests cannot overwrite the latest search.

## Next stages before adoption

1. Review simulation behavior and define the exact existing store selection/fallback policy to preserve. The selector in this simulation demonstrates S, K or both; it does not claim to reproduce every production selection mode.
2. Connect a read-only bank text search adapter with relevance ranking, pagination and bounded response time. Existing bank q search has a 20-row newest-first limit and must not be treated as complete category search.
3. Connect current shop adapters with explicit units, store identity, request timeouts and per-source timing. Benchmark the existing expensive relevance ranking separately; Neon-first alone does not remove the measured 19.4-second processing delay.
4. Add verified store/price updates by EAN; absence from a capped response is not evidence that a store does not carry a product.
5. Test actual image loading and fallback for broken URLs, missing EANs and weight-label identities. A nonempty image URL alone does not prove the image works.
6. Test persistence using an isolated database branch before enabling any EAN-bank writeback. No production writes in this simulation.
7. Validate desktop on a separate preview. Only after acceptance integrate desktop and subsequently mobile. Never reassign the desktop canonical alias to this simulation branch.

Run: node --test tests/neon-first-simulation.test.cjs

## Expanded simulation test run, 28 October 2026

15 automated tests pass. Additional coverage includes selection-scoped requests, untrusted bank prices, nonfinite/negative prices, reversed shop response ordering, snapshot isolation, large result sets, hung sources and aborting an unresponsive provider.

The tests exposed two defects, now fixed on this test branch:
- A store product id could collide with an EAN-less fallback row index. Key namespaces are now distinct.
- A duplicate row with no price could erase a valid price for the same EAN/store. Missing duplicate prices now preserve a valid value.

The simulation now enforces a bounded bank wait (800 ms) and shop wait (5000 ms), cancels the source signal on timeout, and stops waiting immediately on cancellation. These are simulation defaults, not measured production service limits.

A synthetic run merged 3000 input rows into 1750 distinct EAN rows in approximately 14–16 ms on the test runtime. This measures only in-memory merge and snapshot publishing. It does not measure Neon, network latency, actual images, provider coverage or the existing relevance-ranking bottleneck.
