#!/usr/bin/env node
// Final offline shadow-mode comparison. No runtime changes or Neon writes.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const merged=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const simulation=JSON.parse(readFileSync("tokmanni-spar-filter-simulation.json","utf8"));
const search=JSON.parse(readFileSync("tokmanni-spar-search-diff-preview.json","utf8"));
const quality=JSON.parse(readFileSync("tokmanni-spar-quality-gate.json","utf8"));
const regression=JSON.parse(readFileSync("tokmanni-spar-regression-report.json","utf8"));
const total=merged.items.length;
const groups=Object.groupBy(merged.items,x=>x.productClass);
const excluded=(groups.department_store||[]).length;
const checks=[
 ["quality gate",quality.ok===true],
 ["regressions",regression.ok===true],
 ["unique EANs",new Set(merged.items.map(x=>x.ean)).size===total],
 ["shadow preserves all",simulation.counts.shadowHidden===0],
 ["strict removes only department store",simulation.counts.strictHidden===excluded],
 ["scanner retains all",simulation.counts.scannerLost===0],
 ["unknown preserved",simulation.counts.unknownPreserved===true],
 ["search terms preserve shadow results",search.terms.every(x=>x.shadowVisible===x.matched)],
 ["search diff conserved",search.terms.every(x=>x.proposedVisible+x.proposedExcluded===x.matched)],
 ["no Neon writes",simulation.counts.neonWrites===0&&merged.summary.neonWrites===0]
];
const report={ok:checks.every(([,ok])=>ok),snapshot:{total,shadowVisible:total,proposedStrictVisible:total-excluded,proposedStrictExcluded:excluded,daily:(groups.daily||[]).length,review:(groups.review||[]).length},checks:checks.map(([name,ok])=>({name,ok})),caveats:["Offline audit snapshot, not live Klevu query response","Proposed strict filter is disabled in API route","Classification labels require separate approval","No Neon write or production deployment"]};
writeFileSync("tokmanni-spar-shadow-acceptance.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
assert(report.ok,"Shadow acceptance failed");
