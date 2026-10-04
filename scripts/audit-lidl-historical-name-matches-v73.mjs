#!/usr/bin/env node
import {readFileSync} from "node:fs";
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const catalog=load("../data/lidl/official-product-image-price-audit-2026-10-04.json").records;
const historical=load("../data/lidl/official-historical-bakery-prices-2026-04-20.json").records;
const norm=s=>s.normalize("NFC").toLocaleLowerCase("fi").trim();
const matches=historical.map(p=>{const exact=catalog.filter(c=>norm(c.name)===norm(p.name));return {name:p.name,candidateProductIds:exact.map(x=>x.lidlProductId),identityStatus:exact.length===1?"single-name-candidate":exact.length>1?"ambiguous-duplicate-name":"no-exact-name",currentRegularPriceEur:null,comparable:false};});
console.log(JSON.stringify({sourceDate:"2026-04-20",records:matches,counts:{singleNameCandidate:matches.filter(x=>x.identityStatus==="single-name-candidate").length,ambiguous:matches.filter(x=>x.identityStatus==="ambiguous-duplicate-name").length,unmatched:matches.filter(x=>x.identityStatus==="no-exact-name").length},warning:"Name-only matches are candidates, not verified product identities or current checkout prices."},null,2));
if(matches.length!==7)process.exitCode=1;
