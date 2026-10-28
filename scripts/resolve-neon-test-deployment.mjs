#!/usr/bin/env node
// Fail closed: never test an old commit, unrelated project, or mutable alias.
const {VERCEL_TOKEN,VERCEL_TEAM_ID,VERCEL_PROJECT_ID,EXPECTED_SHA,GITHUB_ENV_FILE}=process.env;
if(!VERCEL_TOKEN||!VERCEL_TEAM_ID||!VERCEL_PROJECT_ID||!EXPECTED_SHA||!GITHUB_ENV_FILE) throw Error('Required Vercel secrets / expected SHA missing; refusing stale deployment');
const fs=await import('node:fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let attempt=0;attempt<30;attempt++){
 const endpoint=new URL('https://api.vercel.com/v6/deployments');
 endpoint.searchParams.set('teamId',VERCEL_TEAM_ID);
 endpoint.searchParams.set('projectId',VERCEL_PROJECT_ID);
 endpoint.searchParams.set('limit','30');
 const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+VERCEL_TOKEN}});
 if(!response.ok)throw Error('Vercel deployments API '+response.status);
 const data=await response.json();
 const matches=(data.deployments||[]).filter(d=>d.meta?.githubCommitRef==='test/neon-first-product-search'&&d.meta?.githubCommitSha===EXPECTED_SHA&&d.name==='ziiply');
 if(matches.some(d=>d.state==='ERROR'||d.state==='CANCELED'))throw Error('Expected commit deployment failed');
 const ready=matches.find(d=>d.state==='READY'&&d.url);
 if(ready){
  const base='https://'+ready.url;
  fs.appendFileSync(GITHUB_ENV_FILE,'SEARCH_BASE_URL='+base+'\n');
  console.log('Verified deployment',ready.id,'sha',EXPECTED_SHA,'url',base);
  process.exit(0);
 }
 await sleep(10000);
}
throw Error('No READY ziiply deployment for expected SHA; refusing stale test');
