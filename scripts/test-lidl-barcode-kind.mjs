import assert from "node:assert/strict";
import {classifyLidlObservedBarcode as classify} from "./lib/lidl-barcode-kind.mjs";
assert.deepEqual(classify("6410405319661","packaging"),{kind:"packaging-code-unverified",ean:null,code:"6410405319661"});
assert.deepEqual(classify("2001234567890","scale-label"),{kind:"scale-label-code",ean:null,code:"2001234567890"});
assert.deepEqual(classify("12345678","paistopiste-shelf"),{kind:"paistopiste-shelf-code",ean:null,code:"12345678"});
assert.equal(classify("invalid","packaging").kind,"invalid");
assert.equal(classify("12345678","unknown").kind,"unknown");
console.log("PASS: barcode provenance separated without assigning verified EAN");
