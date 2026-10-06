#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyLidlPublicPriceCard as c } from "./lib/lidl-public-price-classifier.mjs";
assert.equal(c({title:"Tuote",availabilityText:"Myymälässä"}).priceKind,"regular");
assert.equal(c({title:"Juustoviipale",badge:"ERÄ",availabilityText:"Myymälässä 1.10. - 4.10."}).priceKind,"offer");
assert.equal(c({title:"Tuote",promotionText:"Lidl Plus"}).priceKind,"lidl_plus");
assert.equal(c({title:"Tuorejuusto 2 kpl",priceText:"hinta yksittäin 2,89 €"}).priceKind,"offer");
assert.equal(c({title:"Tuote",hasStrikethroughPrice:true}).priceKind,"offer");
assert.equal(c({title:"Uutuus",availabilityText:"Myymälässä 1.10. - 7.10."}).priceKind,"offer");
console.log(JSON.stringify({suite:"Lidl public price classifier",passed:6,failed:0}));
