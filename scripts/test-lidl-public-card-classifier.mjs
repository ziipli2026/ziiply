import assert from "node:assert/strict";
import { classifyLidlPublicCard as classify } from "./lib/lidl-public-card-classifier.mjs";
const today = "2026-10-04";
const cases = [
  [{ labels:"Lidl Plus 4 KPL -31%",validFrom:"2026-10-02",validThrough:"2026-10-04",displayPriceEur:2 }, "member-offer",true,false,false],
  [{ labels:"ERÄ",validFrom:"2026-10-05",validThrough:"2026-10-07",displayPriceEur:4.5 }, "offer-candidate",false,true,false],
  [{ labels:"SUPERHINTA",validFrom:"2026-10-01",validThrough:"2026-10-03",displayPriceEur:1 }, "offer-candidate",false,false,true],
  [{ labels:"",displayPriceEur:3.39 }, "unverified-display",false,false,false],
  [{ labels:"Lidl Plus",displayPriceEur:1.99 }, "member-offer",false,false,false],
  [{ labels:"Tarjous",validFrom:"2026-10-04",validThrough:"2026-10-04" }, "offer-candidate",true,false,false],
  [{ labels:"",quantity:4,referencePriceEur:5.96,displayPriceEur:5 }, "offer-candidate",false,false,false],
];
for (const [card,kind,activeOffer,future,expired] of cases) {
 const actual=classify(card,today);
 assert.equal(actual.kind,kind);
 assert.equal(actual.activeOffer,activeOffer);
 assert.equal(actual.future,future);
 assert.equal(actual.expired,expired);
 assert.equal(actual.regularPriceEur,null);
 if(card.quantity===4){assert.equal(actual.multiBuy,true);assert.equal(actual.referencePriceEur,5.96);}
 assert.equal(actual.comparable,false);
}
console.log("PASS: 7 Lidl public-card research cases");
