const ts=require('typescript');
const filesystem=require('node:fs');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(filesystem.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const kCitymarketPrintedPriceBasis_js_1 = require("../src/app/components/ziiply/offerSearch/providers/kCitymarketPrintedPriceBasis.js");
const kCitymarketPreparedPriceCorrections_ts_1 = require("../src/app/components/ziiply/offerSearch/providers/kCitymarketPreparedPriceCorrections.ts");
const kCitymarketLocalTjekProvider_ts_1 = require("../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts");
const ZiiplyMobileOfferSearchCard_tsx_1 = require("../src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx");
const read = (name) => JSON.parse(node_fs_1.default.readFileSync(require('node:path').join(__dirname, 'fixtures/citymarket', name), 'utf8'));
const evidence = read('42LV-price-evidence.json');
const input = read('42LV-prepared-price-input.json');
const cases = [
    [1, /^WC-PAPERI$/, 24.9, 1, 'setti'], [6, /^WC-PAPERI/, 24.9, 1, 'setti'],
    [6, /KÄSITISKI/, 4.49, 1, 'kpl'], [15, /MAITORAHKA/, 4, 6, 'PRK'],
    [16, /JUUSTORAASTE/, 4.5, 2, 'PS'], [16, /KEITOT/, 10, 3, 'PKT'],
    [17, /JÄÄTELÖPUIKOT/, 5, 3, 'KPL'], [18, /VITAL/, 4.5, 2, 'TLK'],
    [18, /SMOOTHIET/, 5.5, 4, 'KPL'], [18, /MÄRKÄRUOAT/, 4.2, 4, 'KPL'],
    [19, /^SININEN/, 10, 4, 'KPL'], [19, /^ja MAKU/, 10, 4, 'KPL'], [19, /AAKKOSET/, 4.5, 2, 'PS'],
    [20, /8-pack/, 7.99, 1, 'pkt'], [20, /VICHY/, 10.99, 1, 'pkt'],
];
for (const [page, title, total, quantity, unit] of cases)
    (0, node_test_1.default)('Original printed price ' + page + ' ' + title, () => {
        const rows = evidence.rows.filter((r) => r.page === page && title.test(r.title));
        strict_1.default.equal(rows.length, 1);
        const proof = (0, kCitymarketPrintedPriceBasis_js_1.resolvePrintedPriceBasis)(rows[0], evidence.pages[page]);
        strict_1.default.ok(proof);
        strict_1.default.equal(proof.value, total);
        strict_1.default.equal(proof.quantity, quantity);
        strict_1.default.equal(proof.unit, unit);
    });
(0, node_test_1.default)('All 544 existing rows retain identity, categories and order through price correction and cards', () => {
    const offers = (0, kCitymarketPreparedPriceCorrections_ts_1.correctPreparedCitymarketPrices)(input.offers), campaigns = input.campaigns.map(kCitymarketLocalTjekProvider_ts_1.normalizeTjekPackagePrice);
    strict_1.default.equal(offers.length, 89);
    strict_1.default.equal(campaigns.length, 455);
    for (const [before, after] of [[input.offers, offers], [input.campaigns, campaigns]])
        strict_1.default.deepEqual(after.map((r) => [r.id, r.title, r.category, r.campaignType]), before.map((r) => [r.id, r.title, r.category, r.campaignType]));
    strict_1.default.equal(campaigns.filter((r, i) => r.priceText !== input.campaigns[i].priceText).length, 16);
    strict_1.default.equal(offers.filter((r, i) => r !== input.offers[i]).length, 27);
    for (const rows of [offers, campaigns])
        for (const row of rows) {
            const display = (0, ZiiplyMobileOfferSearchCard_tsx_1.getOfferPrice)({ offerPrice: row.price, __sourceOfferSearchResult: row });
            if (row.offerQuantity > 1)
                strict_1.default.match(display, new RegExp('/ ' + row.offerQuantity + ' '));
            if (row.priceBasis === 'package-total') {
                strict_1.default.match(display, /€ \/ pkt \(\d+ kpl\)/);
                strict_1.default.ok(!row.offerQuantity || row.offerQuantity === 1);
            }
        }
    strict_1.default.deepEqual((0, kCitymarketPreparedPriceCorrections_ts_1.correctPreparedCitymarketPrices)(offers), offers);
});
(0, node_test_1.default)('A neighbouring edition, changed price or absent purchase evidence cannot be rewritten', () => {
    const row = input.offers.find((r) => /MAITORAHKA/.test(r.title));
    const other = { ...row, sourceUrl: 'https://example.com/43LV/index.html' };
    strict_1.default.equal((0, kCitymarketPreparedPriceCorrections_ts_1.correctPreparedCitymarketPrices)([other])[0], other);
    const changed = { ...row, price: 8 };
    strict_1.default.equal((0, kCitymarketPreparedPriceCorrections_ts_1.correctPreparedCitymarketPrices)([changed])[0], changed);
    const original = evidence.rows.find((r) => r.page === 15 && /MAITORAHKA/.test(r.title));
    const boxes = evidence.pages[15].filter((b) => b.text !== 'PRK');
    strict_1.default.equal((0, kCitymarketPrintedPriceBasis_js_1.resolvePrintedPriceBasis)(original, boxes), null);
    const anonymous = { ...original, title: 'Other product', category: 'Other category' };
    strict_1.default.deepEqual((0, kCitymarketPrintedPriceBasis_js_1.resolvePrintedPriceBasis)(anonymous, evidence.pages[15]), (0, kCitymarketPrintedPriceBasis_js_1.resolvePrintedPriceBasis)(original, evidence.pages[15]));
});
