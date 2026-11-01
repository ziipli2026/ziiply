// Independent audit oracle. Do not import the production relevance decision.
// A missing word is a review item unless independently proved by a spelling,
// compound, structured brand, category, or one complete observed EAN name.
const fold=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
function words(x){
 return (fold(x).replace(/\b(\d+)\s*x(?=[a-z])/g,'$1 x ').replace(/coca[ -]+cola/g,'cola').replace(/\bcoke\b/g,'cola').replace(/pippuri pekka/g,'pippuripekka').replace(/acidofilus[ -]*bifidus/g,'ab')
  .replace(/(?:perheleipuri|leipomo) salonen/g,'salonen').replace(/(?:tomato )?ketchup|tomaattiketsuppi/g,'ketsuppi')
  .replace(/iso ?paahto|iso kaurapaahtoleipa/g,'isopaahto kaura paahtoleipa')
  .match(/[a-z]+|\d+(?:\.\d+)?/g)||[]).filter(w=>w!=='ja').map(w=>({herneita:'herne',herneet:'herne',kotimaiset:'kotimainen',sipulikuutiot:'sipulikuutio',vanilla:'vanilja',lemon:'sitruuna',tomattia:'tomaattia',mozarellaa:'mozzarellaa',siivu:'siivutettu',viipaloitu:'siivutettu',leivoskeksi:'keksi',chiansiemenet:'chiasiemen',chiasiemenet:'chiasiemen',suodatinjauhatus:'suodatinjauhettu'}[w]||w));
}
function sizes(x){const factors={kg:1000,g:1,l:1000,dl:100,cl:10,ml:1,kpl:1};return [...fold(x).matchAll(/(\d+(?:\.\d+)?)\s*(kg|ml|cl|dl|kpl|g|l)\b/g)].map(([,n,u])=>`${Number(n)*factors[u]}${['kg','g'].includes(u)?'g':['kpl'].includes(u)?'kpl':'ml'}`);}
function compatible(a,b){
 const alternatives=text=>[...fold(text).matchAll(/\b([a-z]{2,})\s*\/\s*([a-z]{2,})\b/g)].filter(([,x,y])=>!['kg','ml','cl','dl'].includes(x)&&!['kg','ml','cl','dl'].includes(y)).map(([,x,y])=>[x,y].sort().join('/'));
 const aa=alternatives(a),bb=alternatives(b);if(aa.length&&bb.length&&!aa.every(x=>bb.includes(x)))return false;
 const left=sizes(a),right=sizes(b);
 for(const unit of ['g','ml','kpl']){const l=left.filter(s=>s.endsWith(unit)),r=right.filter(s=>s.endsWith(unit));if(l.length&&r.length&&!l.some(s=>r.includes(s)))return false;}
 for(const [x,y] of [[/\bzero|sokeriton/,/\boriginal|sokerillinen/],[/\bkofeiiniton/,/\bkofeiinillinen/],[/\bgluteeniton/,/sisaltaa gluteenia/]])if((x.test(fold(a))&&y.test(fold(b)))||(y.test(fold(a))&&x.test(fold(b))))return false;
 return true;
}
const prefixes=new Set(['kevyt','tays','luomu','ruis','kaura','maito','kerma','varhais','kesa','pika','puna','mini','kirsikka','juusto','papu','suodatin','pannu','meri','hieno']);
function auditNamedProduct(query,p){
 const q=words(query),name=String(p.name||p.title||p.productName||''),n=fold(name),cat=fold(p.category),qt=q.join(' ');
 const requestHousehold=/hankausaine|tiskitablet|ilmanraikastin|pesuaine|shampoo|saippua/.test(qt);
 if(!requestHousehold&&/caabu|hankausaine|konetiski|tiskitablet|ilmanraikastin|puhdistusaine|pesuaine|shampoo|saippua/.test(n+' '+cat))return {kind:'wrong_type',reason:'household product in food search'};
 if(/caabo|koiranruoka|kissanruoka/.test(n+' '+cat)&&!/koira|kissa/.test(qt))return {kind:'wrong_type',reason:'pet product in food search'};
 const fruit=q.some(w=>['sitruuna','omena','banaani','appelsiini','mansikka'].includes(w))&&!/mehu|juoma|kivenn|keksi|kakku|hillo|jaatelo|energia|gel|tee|kahvi|suklaa|marmeladi/.test(qt);
 if(fruit&&/lemonade|limonadi|radler|seltzer|juoma|jaatee|yrttitee|elektrolyyt|mehu|muffin|majoneesi|jaatelo/.test(n))return {kind:'wrong_type',reason:'fruit flavour in another product'};
 if(q.includes('ketsuppi')&&!/sipsi|perunalastu|chips/.test(qt)&&/sipsi|perunalastu|chips/.test(n+' '+cat))return {kind:'wrong_type',reason:'ketchup flavour in snack'};
 const requestedSizes=sizes(query),currentSizes=sizes(name+' '+String(p.quantity||''));
 if(currentSizes.length&&requestedSizes.some(s=>!currentSizes.includes(s)))return {kind:'wrong_variant',reason:'requested package size conflicts'};
 const identities=[name,...(Array.isArray(p.aliases)?p.aliases.filter(a=>compatible(name+' '+String(p.quantity||''),a)):[])];
 const brand=words(p.brandName||p.brand);
 for(const identity of identities){
  const actual=words(identity),joined=' '+actual.join(' ')+' ';
  const matches=q.every(w=>actual.some(a=>a===w||a.startsWith(w)||(a.endsWith(w)&&prefixes.has(a.slice(0,-w.length))))||brand.includes(w)
   ||(w==='taysjyvaruisleipa'&&joined.includes('taysjyvaruis ruisleipa'))
   ||(w==='karkkirasia'&&/marmeladi.*rasia|makeisrasia/.test(joined))
   ||(w==='pakaste'&&/^pakasteet\//.test(cat))
   ||(w==='ruodoton'&&/kirjolohifile|lohifile/.test(n)&&/\bd[ -]leikka|\bd[ -]leik/.test(n)&&!/ruodollinen/.test(n)));
  if(matches)return null;
 }
 return {kind:'evidence_review',reason:'name/attribute evidence missing',requested:q,observed:words(name)};
}
module.exports={auditNamedProduct};
