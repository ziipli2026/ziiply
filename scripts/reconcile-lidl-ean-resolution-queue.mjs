#!/usr/bin/env node
import fs from "node:fs";
const queuePath="data/lidl/ean-resolution-queue-v46-2026-10-05.json";
const verifiedPath="data/lidl/verified-ean-links.json";
const queue=JSON.parse(fs.readFileSync(queuePath,"utf8"));
const verified=JSON.parse(fs.readFileSync(verifiedPath,"utf8"));
const byId=new Map(verified.map(x=>[String(x.lidlProductId),x]));
const records=queue.records.map(r=>{
  const hit=byId.get(String(r.lidlProductId));
  return hit?{...r,resolutionStatus:"verified_ean",resolutionReason:"verified_ean_links",ean:hit.ean,evidence:hit.evidence}:r;
});
const counts=records.reduce((a,r)=>(a[r.resolutionStatus]=(a[r.resolutionStatus]||0)+1,a),{});
const unresolved=records.filter(r=>r.resolutionStatus==="needs_external_gtin_lookup");
process.stdout.write(JSON.stringify({
  revision:"V57-EAN-QUEUE-VERIFIED-MASTER-SYNC",
  created:new Date().toISOString(),
  source:queuePath,
  verifiedSource:verifiedPath,
  total:records.length,
  counts,
  unresolvedExternalLookupCount:unresolved.length,
  records
},null,2)+"\n");
