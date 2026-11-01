const assert=require('node:assert/strict'),{auditReferenceCoverage:audit}=require('./lib/audit-reference-coverage.cjs');
(async()=>{
 const ref={query:'A Le Coq Premium olut',expectedNeonEan:'6419800021261',expectPriced:true};
 const current={ean:ref.expectedNeonEan,name:'A. Le Coq Premium olut 0,33l',brand:'A. Le Coq'};
 const request=async path=>({data:{source:'ruoanhinta-k',products:path.startsWith('/api/neon-first-search')?[current]:path.includes('search=A.')?[{...current,price:124}]:[]}});
 assert.equal((await audit(ref,[],request)).state,'known_quote_dropped');
 assert.equal((await audit(ref,[current],request)).state,'visible');
 const empty=async path=>({data:{products:path.startsWith('/api/neon-first-search')?[current]:[]}});
 assert.equal((await audit(ref,[],empty)).state,'no_current_quote_obtained');
 const changed=async path=>({data:{source:'ruoanhinta-k',products:path.startsWith('/api/neon-first-search')?[current]:[{ean:current.ean,name:'Toisen valmistajan limonadi',price:124}]}});
 assert.equal((await audit(ref,[],changed)).state,'current_shop_identity_conflict');
 const unverified=await audit({query:'Kurkku Härkälä',expectedNeonEan:'2000629900000'},[],async()=>({data:{products:[{ean:'2000629900000',name:'Kurkku Juntti'}]}}));
 assert.equal(unverified.state,'catalog_identity_unverified');
 console.log('PASS independent reference probes: missing real quote fails; absent quote and identity conflicts stay explicit');
})().catch(error=>{console.error(error);process.exitCode=1});
