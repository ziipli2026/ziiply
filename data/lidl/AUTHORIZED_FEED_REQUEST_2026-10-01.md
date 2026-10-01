# Lidl FI product-data request — technical scope (research only)

This is a technical checklist for asking Lidl or an explicitly authorized data provider whether Ziiply may receive and use a Finnish product feed. It is **not** an assertion that access, permission, or a feed already exists.

## Questions to resolve before integration
1. Is a machine-readable feed or documented API available for Finland's regular grocery assortment, beyond public promotional products? Who can authorize its use in a consumer-facing price-comparison application?
2. Can it identify individual stores (stable FI store ID) and distinguish regular, promotional and Lidl Plus/member-only prices? What is the effective period and refresh cadence?
3. Does it include product-specific GTIN/EAN, Lidl product ID/IAN separately, exact Finnish display name, pack quantity and unit, category, and discontinued/temporary status?
4. Are stock or assortment flags per store available, and what limitations apply? Does absence from a feed mean out of stock, unlisted or unknown?
5. Are storage, caching, public display, historical comparison, attribution, redistribution, and beta testing permitted? Is there a rate limit, authentication method, test environment or commercial agreement?
6. Can an authorized sample include milk, eggs, butter, pasta, minced meat, banana, potato and cheese from one named store to validate relevance and price provenance?

## Minimum sample schema (illustrative, no real product or price claims)
```json
{
  "records": [
    {
      "productId": "EXAMPLE-PRODUCT-ID",
      "name": "EXAMPLE PRODUCT",
      "ian": null,
      "ean": null,
      "regularPriceEur": null,
      "storeId": "EXAMPLE-FI-STORE-ID",
      "storeScope": "EXAMPLE-FI-STORE-ID",
      "observedAt": null,
      "priceValidFrom": null,
      "priceSource": null,
      "checkoutPriceVerified": false
    }
  ]
}
```

For a genuine candidate import, use `node scripts/check-lidl-feed-v48.mjs path/to/authorized-feed.json` and `node scripts/test-lidl-feed-gate-v50.mjs`. Passing a locally populated JSON file is only a **technical precheck**: confirm permission, source authenticity, coverage and local price accuracy independently. Never invent an EAN from an IAN/product ID, turn missing price into €0, or publish sample data directly.

## Current state
Public-site research candidate set: 226 grocery records, with no reliable matches for ordinary `maito`, `kananmuna`, `voi` or `pasta`. Keep this dataset isolated from production Justiina, basket and comparison until a source meets the coverage and provenance requirements.

## Contact route verified 2026-10-01
Lidl Finland publishes `asiakaspalvelu@lidl.fi` and its customer-service form (`https://asiakaspalvelu.lidl.fi/`) as general contact channels. These are **routing contacts, not a confirmed product-feed or partnership department**. Ask for forwarding to the person responsible for authorized product and store-pricing data licensing. Official source: https://www.lidl.fi/c/osallistumisehdot-lidl-plus/s10021544 (section 11). Do not send this request to the privacy, compliance or media mailbox merely because those addresses are published.

### Concise initial routing request (Finnish)
**Subject:** Ziiply Oy – tiedustelu Lidl Suomen tuotetietojen käyttöluvasta ja rajapinnasta

Hei,

Kehitämme Ziiply Oy:ssä kuluttajille ruokaostosten hinta- ja ostoskorivertailua. Haluaisimme selvittää, onko Lidl Suomen tavanomaisen elintarvikevalikoiman tuotetietoihin ja myymäläkohtaisiin hintoihin saatavissa luvallista koneellista rajapintaa tai tietosyötettä, ja millä ehdoilla tietoja voisi näyttää kuluttajapalvelussa.

Voisitteko välittää tiedustelun tuotetietojen, rajapintojen tai kaupallisten tietolisenssien vastuuhenkilölle? Tarvitsisimme ensivaiheessa tiedon mahdollisuudesta, käyttöehdoista ja mahdollisesta teknisestä yhteyshenkilöstä. Tuotteiden EAN/GTIN, pakkauskoko, myymäläkohtaiset normaali- ja tarjoushinnat sekä voimassaoloajat olisivat keskeisiä kenttiä.

Ystävällisin terveisin,
Ziiply Oy

**Status:** draft only; no message sent, permission or feed received.
