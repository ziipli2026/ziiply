#!/usr/bin/env node
/** Read-only audit; never promotes previous displayed prices to regular prices. */
import { readFileSync } from "node:fs";
const load = path => JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8")).records;
const products=load("../data/lidl/official-product-image-price-audit-2026-10-04.json");
const images=load("../data/lidl/official-product-images.generated.json");
const previous=[
 ...load("../data/lidl/verified-previous-price-observations-2026-10-04.json"),
 ...load("../data/lidl/verified-previous-price-observations-extra-2026-10-04.json")
];
const unique = (rows,label) => { const ids=rows.map(r=>String(r.lidlProductId)); if(new Set(ids).size!==ids.length)throw Error(label+" contains duplicate product IDs"); return new Map(rows.map(r=>[String(r.lidlProductId),r])); };
const catalog=unique(products,"catalog"),imageById=unique(images,"images"),previousById=unique(previous,"previous prices");
const missingImage=[...catalog.keys()].filter(id=>!imageById.get(id)?.imageUrl);
const orphanImages=[...imageById.keys()].filter(id=>!catalog.has(id));
const orphanPrevious=[...previousById.keys()].filter(id=>!catalog.has(id));
const visiblePrevious=[...catalog.keys()].filter(id=>previousById.has(id));
const regularPrices=[...catalog.values()].filter(r=>Number.isFinite(r.priceEur)&&r.priceEur>0&&r.priceUsePolicy!=="do-not-publish-as-current-normal-price");
const report={catalogProducts:catalog.size,officialImageUrls:imageById.size,matchedImageUrls:catalog.size-missingImage.length,missingImageIds:missingImage,orphanImageIds:orphanImages,previousDisplayedPriceObservations:previousById.size,matchedPreviousPriceObservations:visiblePrevious.length,orphanPreviousPriceIds:orphanPrevious,approvedRegularPricesInCatalog:regularPrices.length,checkoutVerifiedRegularPrices:0,warning:"Historical promotional reference prices are not current regular checkout prices; image URLs are research-only."};
console.log(JSON.stringify(report,null,2));
// Historical observations may legitimately cover a different official product category.\n// Image IDs, however, must belong to the audited Paistopiste catalog.\nif(orphanImages.length)process.exitCode=1;
