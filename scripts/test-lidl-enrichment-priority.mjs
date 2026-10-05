import {execFileSync} from "node:child_process";
const r=JSON.parse(execFileSync(process.execPath,["scripts/audit-lidl-enrichment-priority.mjs"],{encoding:"utf8"}));
if(r.counts.missingCanonicalPath!==121) throw new Error("canonical path baseline changed");
if(r.counts.missingPublicPrice!==116) throw new Error("price baseline changed");
if(r.counts.missingEan!==226) throw new Error("EAN baseline changed");
if(r.top.length!==30) throw new Error("priority list missing");
console.log("PASS: Lidl enrichment priority is based on actual missing fields");
