// Read only. Never print environment values, credentials or connection strings.
const token=process.env.VERCEL_TOKEN;
if(!token) { console.log(JSON.stringify({ok:false,blocked:true,reason:'GitHub Actions VERCEL_TOKEN is not configured'})); process.exit(0); }
const query=new URLSearchParams({teamId:'team_i6fa1B4cW6GoZPJU5E3wAR51',gitBranch:'preview/legacy-desktop-ui',decrypt:'true'});
const response=await fetch('https://api.vercel.com/v10/projects/ziiply/env?'+query,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
if(!response.ok) {console.log(JSON.stringify({ok:false,blocked:true,httpStatus:response.status}));process.exit(0);}
const payload=await response.json();
if(!Array.isArray(payload.envs)) throw new Error('Unexpected Vercel environment metadata');
const rows=payload.envs.filter(e=>['DATABASE_URL','POSTGRES_URL','TANKKAUS_TEST_DATABASE_URL','TANKKAUS_API_TOKEN'].includes(e.key));
console.log(JSON.stringify({ok:true,variables:rows.map(e=>({key:e.key,target:e.target,gitBranch:e.gitBranch??null,configured:Boolean(e.value),...(['DATABASE_URL','POSTGRES_URL','TANKKAUS_TEST_DATABASE_URL'].includes(e.key)&&e.value?{databaseHost:new URL(e.value).hostname}: {})}))}));
