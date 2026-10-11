const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
function audit(row){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'price-basis-'));try{const file=path.join(dir,'input.json');fs.writeFileSync(file,JSON.stringify({rawItems:[row]}));const result=spawnSync(process.execPath,['scripts/audit-citymarket-prices.cjs',file],{encoding:'utf8'});return {status:result.status,...JSON.parse(result.stdout)};}finally{fs.rmSync(dir,{recursive:true,force:true});}}
const weight={title:'Filee n. 800 g',price:24.9,unitPrice:24.9,packageSize:'800 g',priceBasis:'PER_KG'};
const drinks={title:'Juoma 24-pack',price:10.99,unitPrice:1.08,packageSize:'24 x 0,33 l',depositTotal:2.4,depositIncluded:true};
test('Kilogram price is compared to kilogram rate',()=>assert.equal(audit(weight).status,0));
test('Incorrect kilogram rate remains blocking',()=>assert.equal(audit({...weight,price:30}).status,1));
test('Printed included deposit reconciles package total',()=>assert.equal(audit(drinks).status,0));
test('Deposit does not conceal an incorrect total',()=>assert.equal(audit({...drinks,price:15}).status,1));
test('Deposit without inclusion proof is not added',()=>assert.equal(audit({...drinks,depositIncluded:false}).status,1));
