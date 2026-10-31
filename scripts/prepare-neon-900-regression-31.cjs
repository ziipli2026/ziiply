// Exact 31 EAN-missing queries, derived from audited fixtures.
const fs=require('node:fs');
const all=JSON.parse(fs.readFileSync('scripts/fixtures/neon-900-queries.json','utf8')).batches.flatMap(b=>b.cases);
const missing=["6408430014804","8004030026018","2000410100008","2000436800005","6407800008252","2387966000007","6430104921217","2000629900000","2000604100005","6409531652223","8718963048275","7350153720670","6413467282508","6413467442407","6409531101196","6416192080012","6437005074899","8076800195019","8076802085912","6412000037094","4062300323520","6430012182113","0672201000068","6411300181445","7613035962965","8710522920664","8715700015026","6416453054813","7350028543762","6416453040502","6416453555105"];
const lookup=new Map(all.map(c=>[c.expectedNeonEan,c.query]));
const queries=missing.map(ean=>{if(!lookup.has(ean))throw Error('Missing fixture '+ean);return lookup.get(ean)});
fs.writeFileSync('neon-900-regression-31-queries.json',JSON.stringify(queries,null,2));
console.log('Prepared',queries.length,'EAN regression queries');
