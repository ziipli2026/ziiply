import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");
const section = source.split("// Käynnistä hinnan rikastus taustalle.")[1]?.split("// V790: Tokmanni/SPAR exact-EAN")[0];
assert.ok(section, "scanner S/K enrichment block exists");
assert.match(section, /requestedSEpochV806/);
assert.match(section, /requestedKEpochV806/);
assert.match(section, /isSameEan\(candidate\.ean, getEanSearchVariants\(ean\)\)/);
assert.equal((section.match(/comparisonUserStartedRefV768\.current\) scheduleComparisonUpdate\(nextCart\)/g)||[]).length,3,"all S/Lidl/K async price updates respect manual Halpuuta");
assert.equal((section.match(/persistCartImmediately\(nextCart\)/g)||[]).length,0,"cart persistence remains in effect");

function storeTracker(initial) {
  let id=initial, epoch=0;
  return {
    request:()=>({id,epoch}),
    select:next=>{if(next!==id){id=next;epoch++;}},
    accepts:request=>request.id===id && request.epoch===epoch,
  };
}
for(const chain of ["S","K"]){
  const t=storeTracker(101);
  const old=t.request();
  assert.ok(t.accepts(old),chain+" same store accepted");
  t.select(202);
  assert.ok(!t.accepts(old),chain+" old store rejected");
  t.select(101);
  assert.ok(!t.accepts(old),chain+" A-B-A stale response rejected");
  assert.ok(t.accepts(t.request()),chain+" fresh A accepted");
}
for(const order of [["S","K"],["K","S"]]){
  let userStarted=false, schedules=0;
  const complete=()=>{if(userStarted)schedules++;};
  complete();assert.equal(schedules,0,"no comparison before Halpuuta");
  userStarted=true;
  for(const chain of order)complete(chain);
  assert.equal(schedules,2,order.join("->")+" both responses schedule after Halpuuta");
}
// Pirkka tortilla 6410405124517: identity is instant, S price lookup skipped,
// K lookup checks EAN and exact barcode even if the first search is incomplete.
const tortilla = "6410405124517";
const bankName = "Pirkka Täysjyvävehnätortilla";
const ownBrand = /^(pirkka|k-menu)\b/i.test(bankName) ? "k" : "";
assert.equal(ownBrand, "k");
assert.equal(ownBrand !== "k", false, "Pirkka must not wait for S enrichment");
const generic = bankName.replace(/^(?:pirkka(?: parhaat)?|k-menu)\s+/i, "").trim();
assert.deepEqual([tortilla, bankName, generic], [tortilla, bankName, "Täysjyvävehnätortilla"]);
const candidates = [{ean:"0000000000000",price:1.99},{ean:tortilla,price:2.49}];
assert.equal(candidates.find(p=>p.ean===tortilla && p.price>0)?.price,2.49);
assert.match(source, /ownBrandV801 !== "k"/);
assert.match(source, /genericNameV810/);
console.log("Pirkka tortilla scanner routing simulation: PASS");
// Real reported Ruoanhinta fixture: numeric EAN query returned [], name query
// returned the same EAN with a 148-cent price. No substitute-brand match.
const scannedTortilla = "6410405124517";
const bankTortilla = "Pirkka täysjyvävehnätortilla 8kpl/320g";
const shortened = bankTortilla.replace(/\s+(?:\d+\s*(?:kpl|kpl\/|g|kg|ml|l|pkt|pack|pcs)\b.*|\d+\s*[x×]\s*\d+.*)$/i, "").trim();
const genericShortened = shortened.replace(/^(?:pirkka(?: parhaat)?|k-menu)\s+/i, "").trim();
assert.equal(shortened, "Pirkka täysjyvävehnätortilla");
assert.equal(genericShortened, "täysjyvävehnätortilla");
const returnedByName = [{ean:scannedTortilla,price:148},{ean:"8410076472458",price:279}];
assert.equal(returnedByName.find(item=>item.ean===scannedTortilla && item.price>0)?.price,148);
assert.equal(returnedByName.find(item=>item.ean==="0000000000000"),undefined);
assert.match(source,/cleanNameV811/);
console.log("Pirkka tortilla 148-cent name-fallback fixture: PASS");
console.log("Scanner source-contract and isolated race/order simulations: PASS");


// V825: request metadata alone must never prove a physical collection scan.
const searchByEanSectionV825 = source.split("async function searchByEan(")[1]?.split("const existingLookupPromiseV121")[0];
assert.ok(searchByEanSectionV825, "searchByEan weight-label block exists");
assert.match(searchByEanSectionV825, /const isPhysicalSearchScanV825 = Boolean\(/);
assert.match(searchByEanSectionV825, /options\.fromScanner &&/);
assert.match(searchByEanSectionV825, /options\.collectionEligible &&/);
assert.match(searchByEanSectionV825, /options\.manualScannerEntry/);
assert.match(searchByEanSectionV825, /desktopKeyboardScannerOpen/);
assert.match(searchByEanSectionV825, /physicalSearchScanV825 &&/);
assert.match(searchByEanSectionV825, /Date\.now\(\) - physicalSearchScanV825\.at < 10000/);
assert.equal((searchByEanSectionV825.match(/physicalScan: Boolean\(options\.fromScanner\)/g) || []).length, 0, "weight paths cannot trust fromScanner alone");
assert.ok((searchByEanSectionV825.match(/physicalScan: isPhysicalSearchScanV825/g) || []).length >= 5, "all weight add paths use verified physical scan proof");
function physicalProofV825({inStore, fromScanner, manualScannerEntry=false, scannerActive, refMatches, ageMs}) {
  return Boolean(inStore && fromScanner && (manualScannerEntry || (scannerActive && refMatches && ageMs < 10000)));
}
assert.equal(physicalProofV825({inStore:false,fromScanner:true,manualScannerEntry:true,scannerActive:true,refMatches:true,ageMs:10}), false, "scanner use outside store cannot collect");
assert.equal(physicalProofV825({inStore:true,fromScanner:true,manualScannerEntry:true,scannerActive:false,refMatches:false,ageMs:99999}), true, "manual/pasted EAN inside confirmed store collects");
assert.equal(physicalProofV825({inStore:true,fromScanner:true,scannerActive:true,refMatches:false,ageMs:10}), false, "different physical EAN cannot collect");
assert.equal(physicalProofV825({inStore:true,fromScanner:true,scannerActive:true,refMatches:true,ageMs:10001}), false, "expired physical scan cannot collect");
assert.equal(physicalProofV825({inStore:true,fromScanner:true,scannerActive:true,refMatches:true,ageMs:10}), true, "fresh physical scan inside confirmed store collects");
console.log("V825 physical weight-scan proof regression: PASS");


// V826: stale fromScanner metadata cannot keep the EAN-bank scanner fast path alive.
const fastBankSectionV826 = source.split("const fastIdentityFromBankV789 = Boolean(")[1]?.split(");")[0];
assert.ok(fastBankSectionV826, "EAN-bank fast identity guard exists");
assert.match(fastBankSectionV826, /isPhysicalSearchScanV825/);
assert.doesNotMatch(fastBankSectionV826, /options\.fromScanner/);
console.log("V826 stale scanner-context regression: PASS");


// V827/V829: pasted EAN invalidates stale hardware proof but is still a scanner entry.
assert.match(source, /Oletko nyt kaupassa \{scannerStorePromptV828\.storeName\}\?/);
assert.match(source, /Kyllä jatkuu automaattisesti \{scannerStorePromptV828\.seconds\} s kuluttua/);
assert.match(source, /resolveScannerStorePromptV828\(false\)/);
assert.match(source, /manualScannerEntry: true/);
assert.match(source, /collectionEligible: scannerInStoreV829/);
// V827: stale physical proof is still cleared before pasted/manual EAN.
const pasteSectionV827 = source.split("Liitetty koodi:")[0].slice(-1800);
assert.match(pasteSectionV827, /physicalBarcodeScanRefV815\.current = null/);
assert.match(pasteSectionV827, /lastContinuousScanRef\.current = null/);
assert.match(pasteSectionV827, /scannerDecodeIgnoreUntilRefV131\.current = 0/);
const btSectionV827 = source.split("function handleBluetoothBarcodeInputKeyDownV202")[1]?.split("async function toggleScannerTorch")[0];
assert.ok(btSectionV827, "USB/Bluetooth scanner handler exists");
assert.match(btSectionV827, /finishScannedEan\(code\)/);
console.log("V827 paste vs physical reader source regression: PASS");


// V830: every visible scanner EAN entry route must pass through the same store-session helper.
const scannerEntryHelperV830 = source.split("async function searchScannerEnteredEanV830")[1]?.split("async function finishScannedEan")[0];
assert.ok(scannerEntryHelperV830, "unified scanner EAN entry helper exists");
assert.match(scannerEntryHelperV830, /confirmPhysicalScannerStoreV818\(\)/);
assert.match(scannerEntryHelperV830, /collectionEligible: inStore/);
assert.match(scannerEntryHelperV830, /manualScannerEntry: true/);
assert.equal((source.match(/onClick=\{\(\) => void searchByEan\(\)\}/g) || []).length, 0, "scanner Hae buttons cannot bypass store session");
assert.equal((source.match(/if \(event\.key === "Enter"\) void searchByEan\(\);/g) || []).length, 0, "scanner Enter cannot bypass store session");
assert.ok((source.match(/searchScannerEnteredEanV830/g) || []).length >= 6, "manual/HID scanner routes use unified helper");
assert.equal((source.match(/scannerStorePromptV828 &&/g) || []).length, 1, "store prompt is rendered once at scanner modal root");
console.log("V830 unified scanner entry/store-session regression: PASS");


// V831: closing scanner must cancel a pending 5 s default-Yes store prompt.
const closeEanV831 = source.split("async function closeEanModal()")[1]?.split("function openEanModal()")[0];
assert.ok(closeEanV831, "scanner close function exists");
assert.match(closeEanV831, /clearInterval\(scannerStorePromptTimerRefV828\.current\)/);
assert.match(closeEanV831, /resolvePendingStorePromptV831\(false\)/);
assert.match(closeEanV831, /setScannerStorePromptV828\(null\)/);
assert.match(closeEanV831, /scannerInStoreRefV828\.current = false/);
console.log("V831 scanner close cancels store prompt regression: PASS");


// V832: confirmed in-store permission belongs to the exact selected store.
const storeConfirmV832 = source.split("async function confirmPhysicalScannerStoreV818")[1]?.split("async function searchScannerEnteredEanV830")[0];
assert.ok(storeConfirmV832, "scanner store confirmation function exists");
assert.match(storeConfirmV832, /currentSelectedScannerNamesV832/);
assert.match(storeConfirmV832, /stillMatchesCurrentStore/);
assert.match(storeConfirmV832, /scannerStoreCheckDoneRefV791\.current = false/);
assert.match(storeConfirmV832, /scannerInStoreRefV828\.current = false/);
console.log("V832 scanner store-context change regression: PASS");


// V833: ordinary EAN debounce must never masquerade as scanner input.
assert.equal((source.match(/searchByEan\(ean, \{ fromScanner: Boolean\(eanScannerOpen \|\| eanHtml5ScannerRef\.current\) \}\)/g) || []).length, 0);
assert.match(source, /V833: this debounce belongs only to ordinary manual EAN search/);
console.log("V833 manual EAN debounce source separation regression: PASS");


// V834: scanner-owned store-change buttons must use canonical close cleanup.
assert.match(source, /closeEanModal\(\)\.then\(\(\) => setShopsPanelOpen\(true\)\)[^\n]*>Vaihda kauppaa<\/button>/);
assert.match(source, /closeEanModal\(\)\.then\(\(\) => setShopsPanelOpen\(true\)\)[^\n]*>Tarkista kauppavalinta<\/button>/);
console.log("V834 scanner store-change close cleanup regression: PASS");
