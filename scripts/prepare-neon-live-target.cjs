const {execFileSync}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
if(!process.env.VERCEL_TOKEN)throw Error('Missing VERCEL_TOKEN');
const host='ziiply-git-preview-legacy-desktop-ui-ziipli2026s-projects.vercel.app';
function api(path){return JSON.parse(execFileSync('vercel',['api',path,'--scope','ziipli2026s-projects'],{encoding:'utf8',timeout:30000,env:process.env}));}
const alias=api('/v4/aliases/'+host);
const deployment=api('/v13/deployments/'+alias.deploymentId);
assert.equal(deployment.readyState||deployment.state,'READY','Desktop preview must be READY');
assert.equal(deployment.meta?.githubCommitRef,'preview/legacy-desktop-ui');
const url='https://'+deployment.url,sha=deployment.meta.githubCommitSha;
assert.match(sha,/^[a-f0-9]{40}$/);assert.ok(new URL(url).hostname.endsWith('-ziipli2026s-projects.vercel.app'));
execFileSync('git',['fetch','--no-tags','origin',sha],{stdio:'pipe'});
execFileSync('git',['diff','--exit-code',sha,'HEAD','--','src/app/components/ziiply/search/desktopNormalRelevance.ts','src/app/api/neon-first-search/route.ts','src/app/desktop-preview/DesktopPreviewClient.tsx'],{stdio:'pipe'});
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`PREVIEW_URL=${url}\nTARGET_COMMIT=${sha}\n`);
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`preview_url=${url}\ntarget_commit=${sha}\n`);
console.log(JSON.stringify({target:url,commit:sha,ready:true,sourceMatches:true}));
