#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyLidlPublicPriceCard as c } from "./lib/lidl-public-price-classifier.mjs";
const regular=c({title:"ARLA Juustoviipale",availabilityText:"Myymälässä"});
const currentPromo=c({title:"ARLA Juustoviipale",promotionText:"ERÄ Myymälässä 1.10. - 4.10.",validFrom:"2026-10-01",validThrough:"2026-10-04"});
assert.equal(regular.priceKind,"regular");
assert.equal(currentPromo.priceKind,"offer");
const plus=c({title:"Tuote 2 kpl",promotionText:"Lidl Plus -äpillä",isLidlPlus:true,isMultiBuy:true,validFrom:"2026-10-01",validThrough:"2026-10-07"});
assert.equal(plus.priceKind,"lidl_plus");
console.log(JSON.stringify({suite:"Lidl current promo override",passed:3,failed:0}));
