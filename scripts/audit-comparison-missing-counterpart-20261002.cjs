const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("src/app/components/ziiply/cards/ZiiplyMobileCompareCardresponsive.tsx","utf8");
const chain=fs.readFileSync("src/app/page.tsx","utf8");
assert.match(source,/if \(aComplete !== bComplete\) return aComplete \? -1 : 1;/);
assert.match(source,/if \(storeMissing !== cheapestMissing \|\| storeCount !== cheapestCount\) return null;/);
assert.match(source,/const hasNoCounterpart =[\s\S]*?Number\(store\.itemCount \|\| 0\)\) === 0/);
assert.match(source,/const diffLabel = hasNoCounterpart \\|\\| Math\\.max/);
assert.match(chain,/missingItems: comparableCart\.length - visibleSListV804\.length/);
assert.match(chain,/missingItems: comparableCart\.length - visibleKListV804\.length/);
function cheapest(stores){return [...stores].sort((a,b)=>{const ac=a.missingItems===0,bc=b.missingItems===0;if(ac!==bc)return ac?-1:1;if(a.itemCount!==b.itemCount)return b.itemCount-a.itemCount;return a.totalPrice-b.totalPrice})[0]}
function diff(store,best){if(store.missingItems!==best.missingItems||store.itemCount!==best.itemCount)return null;return store.totalPrice-best.totalPrice}
const full={id:"S",totalPrice:550,itemCount:2,missingItems:0};
const missing={id:"K",totalPrice:0,itemCount:0,missingItems:2};
const partial={id:"K",totalPrice:199,itemCount:1,missingItems:1};
assert.equal(cheapest([missing,full]).id,"S");
assert.equal(cheapest([partial,full]).id,"S");
assert.equal(diff(missing,full),null);
assert.equal(diff(partial,full),null);
assert.equal(diff({id:"K",totalPrice:550,itemCount:2,missingItems:0},full),0);
console.log("PASS missing counterpart: zero/partial price never wins against complete basket; mismatched coverage has no savings label");
console.log("NOTE source guards and isolated comparator simulation, not a live store-API integration test");
