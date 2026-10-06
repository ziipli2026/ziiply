#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
const page=fs.readFileSync("src/app/page.tsx","utf8");
assert.match(page,/bankSourceV786 === "lidl-verified-ean-master"/);
assert.match(page,/\/api\/lidl\/ean-price\?/);
assert.match(page,/data\?\.status !== "fresh"/);
assert.match(page,/Number\(data\.price\.priceEur \|\| 0\)/);
const block=page.slice(page.indexOf("// V827:"),page.indexOf("// Selected Citymarket/K-store"));
assert.ok(!block.includes("/api/lidl/products"),"legacy Lidl adapter must not be called from scanner cache block");
assert.ok(!block.includes("ruoanhinta"),"legacy third-party source must not be called from scanner cache block");
console.log(JSON.stringify({suite:"Lidl scanner Neon price cache gate",passed:6,failed:0}));
