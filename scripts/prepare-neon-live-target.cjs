const {execFileSync}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
if(!process.env.VERCEL_TOKEN)throw Error('Missing VERCEL_TOKEN');
const stable='https://ziiply-git-preview-legacy-desktop-ui-ziipli2026s-projects.vercel.app';
async function main(){
 let info,lastError;const deadline=Date.now()+180000;
 // A newly added readiness route may still be deploying when validation starts.
 for(let attempt=0;attempt<24&&Date.now()<deadline;attempt++){
  try{
   info=JSON.parse(execFileSync('vercel',['curl',stable+'/api/desktop-search-version','--','-sS','-f'],{encoding:'utf8',timeout:30000,env:process.env,stdio:['ignore','pipe','pipe']}));
   break;
  }catch(error){lastError=error;if(attempt<23)await new Promise(resolve=>setTimeout(resolve,5000));}
 }
 if(!info)throw Error('Desktop version endpoint unavailable: '+String(lastError));
 assert.equal(info.ok,true);assert.equal(info.branch,'preview/legacy-desktop-ui');
 const url=info.deploymentUrl,sha=info.commit;
 assert.match(sha,/^[a-f0-9]{40}$/);assert.ok(new URL(url).hostname.endsWith('-ziipli2026s-projects.vercel.app'));
 execFileSync('git',['fetch','--no-tags','--depth=1','origin',sha],{stdio:'pipe'});
 try{execFileSync('git',['diff','--exit-code',sha,'HEAD','--','src/app/components/ziiply/search/desktopNormalRelevance.ts','src/app/api/neon-first-search/route.ts','src/app/desktop-preview/DesktopPreviewClient.tsx'],{stdio:'pipe'});}
 catch{throw Error('Published desktop search source differs from selected branch. Publish the latest branch and update its preview alias before starting the audit.');}
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`PREVIEW_URL=${url}\nTARGET_COMMIT=${sha}\n`);
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`preview_url=${url}\ntarget_commit=${sha}\n`);
 console.log(JSON.stringify({target:url,commit:sha,ready:true,sourceMatches:true}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
