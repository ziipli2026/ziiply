const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const load=path=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:()=>load('src/lib/fuelPhoto.ts')});return exports;};
const {parseRecoveryReading:parse,recoveryConsensus:consensus,recoveryComplete:complete}=load('src/lib/fuelPhotoRecovery.ts');
const a=parse({prices:{price95:2.178,price98:2.275,diesel:2.421},visibleFuels:['price95','price98','diesel']},'original');
const b={...a,method:'contrast-sharpen'};
assert.equal(consensus([a]),null);assert.equal(consensus([a,a]),null,'Same treatment cannot vote twice');
assert.equal(consensus([a,b]).price95,2.178);
assert.equal(consensus([a,{...b,prices:{...b.prices,price95:2.118}}]).price95,undefined,'Conflicting digits remain unresolved');
assert.equal(consensus([a,{...b,prices:{price95:2.178}}]).price95,2.178,'Confirmed fuels may be shown while other rows are pending');
assert.equal(consensus([parse({prices:{price95:2.178},visibleFuels:['price95'],uncertain:['price95']},'original'),b]),null);
assert.equal(consensus([parse({},'original'),parse({},'contrast')]),null,'Blank photo is not a price');
console.log('Recovery consensus checks passed');

const first=parse({prices:{diesel:2.412,price95:2.215,price98:2.290},visibleFuels:['diesel','price95','price98']},'full-board');
const upper=parse({prices:{price95:2.215,price98:2.290},visibleFuels:['price95','price98']},'contrast');
const pending=consensus([first,upper]);
assert.equal(pending.diesel,undefined,'one diesel reading is not confirmed');
assert.equal(pending.price95,2.215);
assert.equal(complete([first,upper],pending),false,'confirmed petrol must not stop a pending diesel retry');
const bottom=parse({prices:{diesel:2.412},visibleFuels:['diesel']},'enlarged-tiles');
assert.equal(complete([first,upper,bottom],consensus([first,upper,bottom])),true);
const petrolOnly=[upper,{...upper,method:'tiles'}];
assert.equal(complete(petrolOnly,consensus(petrolOnly)),true,'no diesel is required on a petrol-only board');
const dieselOnly=[bottom,{...bottom,method:'full-board'}];
assert.equal(complete(dieselOnly,consensus(dieselOnly)),true,'diesel-only boards may finish');
assert.equal(complete([],null),false);
const conflict={...bottom,prices:{diesel:2.472},method:'conflict'};
assert.equal(complete([first,upper,conflict],consensus([first,upper,conflict])),false,'conflicting diesel stays unresolved');
console.log('PASS: bottom-row diesel retry, partial petrol, all visible fuels, diesel-only and conflicting digits');

(async()=>{
 const source=fs.readFileSync('src/lib/fuelPhotoLearning.ts','utf8');
 const photo='data:image/jpeg;base64,'+Buffer.from('whole board including diesel').toString('base64');
 let job={id:'test',attempts:0,photo_data_url:photo,readings:[]},saved;
 const sql=async(strings,...values)=>{
  const query=strings.join('?');
  if(query.includes('current_setting'))return [{branch:'test-branch'}];
  if(query.includes('WITH candidate'))return [{...job,attempts:++job.attempts}];
  if(query.includes('recovered_prices=')){job.readings=JSON.parse(values[0]);saved={prices:JSON.parse(values[1]),status:values[2]};}
  return [];
 };
 const overviewRequests=[];
 const outputs=[
  {prices:{diesel:2.412,price95:2.215,price98:2.290},visibleFuels:['diesel','price95','price98']},
  {prices:{price95:2.215,price98:2.290},visibleFuels:['price95','price98']},
  {prices:{diesel:2.412},visibleFuels:['diesel']}
 ];
 const sharp=()=>{const pipe={rotate:()=>pipe,jpeg:()=>pipe,extract:()=>pipe,resize:()=>pipe,normalise:()=>pipe,sharpen:()=>pipe,metadata:async()=>({width:600,height:900}),toBuffer:async()=>Buffer.from('enlarged crop')};return pipe;};
 const exports={};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,Buffer,process:{env:{OPENAI_API_KEY:'test'}},AbortSignal,
  fetch:async(url,options)=>{
   const body=JSON.parse(options.body);
   overviewRequests.push(body.messages[body.messages.length-1].content);
   return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(outputs.shift())}}]})};
  },
  require:name=>{
   if(name==='node:crypto')return require(name);
   if(name==='@neondatabase/serverless')return {neon:()=>sql};
   if(name==='sharp')return {default:sharp};
   if(name==='./fuelDatabase')return {fuelDatabaseConfig:()=>({connection:'test',expectedBranch:'test-branch'})};
   if(name==='./fuelPhotoRecovery')return load('src/lib/fuelPhotoRecovery.ts');
   throw Error(name);
  }
 });
 await exports.processFuelPhotoLearning('test');
 assert.equal(saved.status,'queued');
 await exports.processFuelPhotoLearning('test');
 assert.equal(saved.status,'queued','the actual worker must request the third reading for diesel');
 assert.equal(saved.prices.diesel,undefined);
 await exports.processFuelPhotoLearning('test');
 assert.equal(saved.status,'recovered');
 assert.equal(saved.prices.diesel,2.412);
 assert.equal(overviewRequests.length,3);
 for(const views of overviewRequests)assert.equal(views[0].image_url.url,photo,'every retry retains the full board');
 console.log('PASS: actual recovery worker retains every row and continues to a third diesel confirmation');
})().catch(error=>{console.error(error);process.exitCode=1;});


const {recoveryPreview:preview,selectFuelPhotoExamples:examples}=load('src/lib/fuelPhotoRecovery.ts');
assert.equal(preview([first]).diesel,2.412,'first reading is available before consensus');
assert.equal(preview([first,conflict]).diesel,undefined,'conflicting previews are suppressed');
const sig='0'.repeat(256),feedback={id:'confirmed',signature:'1'+'0'.repeat(255),prices:{diesel:2.412}};
assert.equal(examples(sig,[]).length,0);
assert.equal(examples(sig,[feedback])[0].id,'confirmed','new feedback changes the next recognition context');
assert.equal(examples(sig,[{...feedback,signature:'1'.repeat(256)}]).length,0,'unrelated board is not a teaching example');
assert.equal(examples(sig,[{...feedback,prices:{price95:3,price98:2}}]).length,0,'inconsistent corrections must not teach the reader');
console.log('PASS: instant first result, conflicting previews and feedback selection');
