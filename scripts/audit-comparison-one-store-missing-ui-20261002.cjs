const assert=require("node:assert/strict");
const fs=require("node:fs");
const src=fs.readFileSync("src/app/components/ziiply/cards/ZiiplyMobileCompareCardresponsive.tsx","utf8");
assert.match(src,/const hasNoCounterpart =[\s\S]*?comparedCount > 0 &&[\s\S]*?Number\(store\.itemCount \|\| 0\)\) === 0/);
assert.match(src,/const isBest = !hasNoCounterpart &&/);
assert.match(src,/const diffLabel = hasNoCounterpart \\|\\| Math\\.max/);
assert.match(src,/hasNoCounterpart\s*\? "Vastinetta ei löytynyt"/);
assert.match(src,/hasNoCounterpart \? "—" : formatEuro\(store\.totalPrice\)/);
assert.match(src,/if \(aComplete !== bComplete\) return aComplete \? -1 : 1/);
assert.match(src,/if \(storeMissing !== cheapestMissing \|\| storeCount !== cheapestCount\) return null/);
const items=[{id:"product-1",name:"Justiinan normaalituote"}];
const stores=[
 {id:"S",totalPrice:249,itemCount:1,missingItems:0,matches:[{cartItemId:"product-1",price:249}]},
 {id:"K",totalPrice:0,itemCount:0,missingItems:1,matches:[]}
];
const cheapest=[...stores].sort((a,b)=>{const ac=a.missingItems===0,bc=b.missingItems===0;if(ac!==bc)return ac?-1:1;if(a.itemCount!==b.itemCount)return b.itemCount-a.itemCount;return a.totalPrice-b.totalPrice})[0];
assert.equal(cheapest.id,"S");
const k=stores[1],noCounterpart=items.length>0&&k.itemCount===0&&k.missingItems>0;
assert.equal(noCounterpart,true);
const isBest=!noCounterpart&&(k.id===cheapest.id);
assert.equal(isBest,false);
const diff=k.missingItems!==cheapest.missingItems||k.itemCount!==cheapest.itemCount?null:k.totalPrice-cheapest.totalPrice;
assert.equal(diff,null);
const matchedIds=new Set(k.matches.map(m=>m.cartItemId));
const missingRows=items.filter(i=>!matchedIds.has(i.id)).map(i=>({...i,isMissingComparisonItem:true}));
assert.deepEqual(missingRows.map(x=>x.id),["product-1"]);
assert.equal(missingRows[0].isMissingComparisonItem,true);
console.log("PASS one-store-only counterpart: S full basket, K missing item, K price placeholder, no K best/savings, missing detail row");
console.log("NOTE isolated fixture plus source guards, not live browser or retailer search");
