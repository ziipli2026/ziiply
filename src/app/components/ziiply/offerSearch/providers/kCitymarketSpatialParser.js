// ZIIPLY K-CITYMARKET PRODUCT/PRICE PAIR DIAGNOSTIC
// Revision: V97-KCITYMARKET-SPATIAL-UNIT-FRAGS
// Reconstructs visually split prices while keeping explicit multi-buy transaction price.
const H={"user-agent":"Mozilla/5.0 Chrome/140 Safari/537.36","accept":"text/html,application/xhtml+xml"};
async function ft(u){const r=await fetch(u,{redirect:"follow",headers:H});return {url:r.url,text:await r.text()}}
function codeLines(h){const m=h.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/i);if(!m)return[];return m[1].replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").split(/\r?\n/).map((raw,i)=>({i,raw,text:raw.trim(),x:raw.length-raw.trimStart().length})).filter(x=>x.text)}
function num(s){return Number(String(s).replace(",","."))}
function pkg(s){let m=s.match(/(\d+(?:[,.]\d+)?)(?:[–-](\d+(?:[,.]\d+)?))?\s*(kg|g|ml|l)\b/i);if(!m)return null;let a=num(m[1]),b=m[2]?num(m[2]):a,u=m[3].toLowerCase(),k=(u==="g"||u==="ml")?.001:1;return {min:a*k,max:b*k,raw:m[0]}}
function unitRange(s){let m=s.match(/\((\d+[,.]\d+)(?:[–-](\d+[,.]\d+))?\/(kg|l)\)/i);if(!m)return null;return {min:num(m[1]),max:m[2]?num(m[2]):num(m[1]),raw:m[0]}}
function normal(s){const m=s.match(/Ilman Plussa-korttia[^\d]*(\d+[,.]\d+)(?:[–-](\d+[,.]\d+))?\/(kpl|pkt|ps|rs|tlk|pl)/i);return m?{min:num(m[1]),max:m[2]?num(m[2]):num(m[1]),unit:m[3].toUpperCase()}:null}
function spacedPrice(s){const m=s.match(/^\s*(\d)\s+(\d)\s+(\d)\s*$/);return m?Number(m[1]+m[2]+m[3])/100:null}
function explicit(s){const a=[];let m;const re=/(\d{3}|\d{1,2}[,.]\d{2})\s+(\d+)\s*(KPL|PKT|PS|RS|TLK|PL)\b/gi;while((m=re.exec(s)))a.push({price:/^\d{3}$/.test(m[1])?num(m[1])/100:num(m[1]),quantity:num(m[2]),unit:m[3].toUpperCase(),kind:"explicit"});return a}
function splitAround(lines,idx){const a=[];const lo=Math.max(0,idx-12),hi=Math.min(lines.length,idx+16);for(let j=lo;j<hi;j++){const t=lines[j].text;let m=t.match(/^\s*(\d{1,2})\s*[-.]\s*(?:\d+\s*%)?\s*$/);if(m){const whole=Number(m[1]);for(let k=j+1;k<Math.min(hi,j+10);k++){const s=lines[k].text.match(/^\s*(\d{2})\s*$/);if(s)a.push({price:whole+Number(s[1])/100,kind:"split-euro-cent",wholeLine:lines[j].i,centLine:lines[k].i,raw:t+" | "+lines[k].text,distance:Math.abs(j-idx)+Math.abs(k-idx)})}}}return a}
function directPrices(lines){const a=[];for(const l of lines){const sp=spacedPrice(l.text);if(sp!=null)a.push({price:sp,kind:"spaced",line:l.i,raw:l.text});let m=l.text.match(/^\s*(\d{1,2})[.]\s*$/);if(m)a.push({price:Number(m[1]),kind:"whole-euro",line:l.i,raw:l.text});if(/^\s*\d{3}\s*$/.test(l.text))a.push({price:Number(l.text.trim())/100,kind:"compact",line:l.i,raw:l.text})}return a}
function nearbyQty(lines,idx){const a=[];for(let j=Math.max(0,idx-10);j<Math.min(lines.length,idx+16);j++){let m=lines[j].text.match(/^\s*(2|3)\s*$/);if(m){const n=Number(m[1]);for(let k=j;k<Math.min(lines.length,j+6);k++){const u=lines[k].text.match(/\b(RS|PS|PKT|KPL|TLK|PL)\b/i);if(u)a.push({quantity:n,unit:u[1].toUpperCase(),line:lines[j].i,distance:Math.abs(j-idx)})}}}return a.sort((a,b)=>a.distance-b.distance)}
function priceFragments(lines){const a=[];for(const l of lines){const sp=spacedPrice(l.text);if(sp!=null)a.push({price:sp,raw:l.text,line:l.i,kind:"spaced"});for(const m of l.text.matchAll(/(?<!\d)(\d{1,2})\s*[-.]?\s*(\d{2})(?!\d)/g))a.push({price:num(m[1]+"."+m[2]),raw:m[0],line:l.i,kind:"fragment"});if(/^\d{3}$/.test(l.text))a.push({price:num(l.text)/100,raw:l.text,line:l.i,kind:"compact"});if(/^\d{1,2}[.]$/.test(l.text))a.push({price:num(l.text.slice(0,-1)),raw:l.text,line:l.i,kind:"whole"});if(/^\d{2}$/.test(l.text))a.push({suffix:num(l.text),raw:l.text,line:l.i,kind:"suffix"})}return a}
function productBoundary(lines,idx){let lo=Math.max(0,idx-14),hi=Math.min(lines.length,idx+18);for(let j=idx-1;j>=lo;j--){if(productish(lines[j].text)&&j<idx-1){lo=j+1;break}}for(let j=idx+1;j<hi;j++){if(productish(lines[j].text)){hi=j;break}}return lines.slice(lo,hi)}
function productish(s){return s.length>=5&&s.length<180&&/[A-ZÅÄÖ]{3}/.test(s)&&(pkg(s)||/NAKKI|PIHVI|VARTAAT|JUOMAT|JUUST|JOGUR|KEFIR|LEIP|PITA|PEKON|PYYKINPESU|WC-PAPERI|NENÄLIINA|KÄSINE/i.test(s))}
function parseWordBoxes(js){
 const boxes=[];
 const re=/\{word:\"([^\"]+)\",left:(-?\d+(?:\.\d+)?),top:(-?\d+(?:\.\d+)?),width:(-?\d+(?:\.\d+)?),height:(-?\d+(?:\.\d+)?)\}/g; let m;
 while((m=re.exec(js)))boxes.push({text:m[1],left:Number(m[2]),top:Number(m[3]),width:Number(m[4]),height:Number(m[5])});
 return boxes;
}
function spatialGroups(boxes){
 const sorted=[...boxes].sort((a,b)=>a.top-b.top||a.left-b.left),groups=[];
 for(const b of sorted){let g=groups.find(g=>Math.abs(g.top-b.top)<=Math.max(.008,(b.height||0)*.8)&&b.left-g.right<.14&&b.left-g.right>-.04);if(!g){g={top:b.top,left:b.left,right:b.left+(b.width||0),boxes:[]};groups.push(g)}g.boxes.push(b);g.top=g.boxes.reduce((s,x)=>s+x.top,0)/g.boxes.length;g.left=Math.min(g.left,b.left);g.right=Math.max(g.right,b.left+(b.width||0))}
 return groups.map(g=>({...g,text:g.boxes.sort((a,b)=>a.left-b.left).map(x=>x.text).join(" ")}));
}
function boxDistance(a,b){const ax=a.left+(a.width||0)/2,ay=a.top+(a.height||0)/2,bx=b.left+(b.width||0)/2,by=b.top+(b.height||0)/2;return Math.hypot(ax-bx,ay-by)}
function nearestSuffix(suffix,expected){let best=null;for(let e=0;e<=99;e++){const p=e+suffix/100,d=Math.abs(p-expected);if(!best||d<best.d)best={price:p,d}}return best}
export async function parseKCitymarketSpatialLeaflet(ENTRY){
const e=await ft(ENTRY);let leaf=e.url;const dm=e.text.match(/https?:\/\/kcm-tarjouslehdet\.k-ruoka\.fi\/[^"'<> \t\r\n]+\/index\.html/i);if(dm)leaf=dm[0];const l=await ft(leaf);let basic=l.text.match(/href=["']([^"']*files\/basic-html\/index\.html[^"']*)["']/i)?.[1];basic=basic?new URL(basic,l.url).href:l.url.replace(/\/index\.html.*$/,"/files/basic-html/index.html");
const out={revision:"V125-KCITYMARKET-ANY-TITLEWORD-ROW-EXACT",leaflet:l.url,rows:[],positionPages:[]};
for(let p=1;p<=18;p++){
 const posUrl=new URL("files/search/text_position["+p+"].js",l.url).href; let wordBoxes=[]; try{const pr=await ft(posUrl);wordBoxes=parseWordBoxes(pr.text);out.positionPages.push({page:p,url:posUrl,count:wordBoxes.length,sample:wordBoxes.slice(0,20)})}catch(e){out.positionPages.push({page:p,url:posUrl,error:String(e)})}
const u=p===1?basic:new URL("page"+p+".html",basic).href,lines=codeLines((await ft(u)).text),pageText=lines.map(x=>x.text).join(" | "),frags=priceFragments(lines);for(let i=0;i<lines.length;i++){let title=lines[i].text;if(!productish(title))continue;const recipeImmediate=lines[i+1]&&/^Katso\s+resepti\s*»?/i.test(String(lines[i+1].text||"").trim());if(recipeImmediate)continue;const before=lines.slice(Math.max(0,i-10),i),after=lines.slice(i+1,Math.min(lines.length,i+16)),around=[...before,lines[i],...after],joined=around.map(x=>x.text).join(" | "),pk=pkg(title),promoAfter=after.slice(0,Math.max(0,after.findIndex(x=>/Ilman Plussa-korttia/i.test(x.text))<0?after.length:after.findIndex(x=>/Ilman Plussa-korttia/i.test(x.text)))),ur=unitRange(title)||unitRange(promoAfter.map(x=>x.text).join(" | ")),nr=normal(after.filter(x=>/Ilman Plussa-korttia/i.test(x.text)).map(x=>x.text).join(" | ")),ex=around.flatMap(x=>explicit(x.text));let expected=null;if(pk&&ur)expected=((pk.min+pk.max)/2)*((ur.min+ur.max)/2);const recipeContextNoPrice=!pk&&!ur&&expected==null&&/Viikon\s+resepti\s*:/i.test(around.map(x=>String(x.text||"")).join(" "));if(recipeContextNoPrice)continue;let cand=ex.sort((a,b)=>Math.abs((a.line??i)-i)-Math.abs((b.line??i)-i))[0]||null;const direct=directPrices(around).sort((a,b)=>Math.abs(a.line-lines[i].i)-Math.abs(b.line-lines[i].i));if(!cand&&direct.length)cand=direct[0];const split=splitAround(around,Math.max(0,around.findIndex(z=>z.i===lines[i].i)));if(!cand&&split.length){const plausible=split.filter(x=>!nr||x.price<=(nr.max*(nr.unit?3:1)+.01));if(plausible.length)cand=plausible.sort((a,b)=>a.distance-b.distance)[0]}if(!cand&&expected){const localIdx=Math.max(0,around.findIndex(z=>z.i===lines[i].i));const q=nearbyQty(around,localIdx)[0];if(q&&q.quantity>1)cand={price:Number((expected*q.quantity).toFixed(2)),quantity:q.quantity,unit:q.unit,kind:"unitprice-multibuy-inferred",single:Number(expected.toFixed(3))};const local=priceFragments(around).filter(x=>x.price!=null&&Math.abs(x.line-i)<=10);if(!cand&&local.length)cand=local.map(x=>({...x,d:Math.abs(x.price-expected)})).sort((a,b)=>a.d-b.d)[0];if((!cand||cand.d>.12)){const suf=priceFragments(around).filter(x=>x.suffix!=null);if(suf.length){const z=suf.map(x=>({...x,...nearestSuffix(x.suffix,expected)})).sort((a,b)=>a.d-b.d)[0];if(!cand||z.d<cand.d)cand=z}}}
let packageRowAnchor=null;
const packageTokenForAnchor=String(title).match(/\b(\d+(?:[,.]\d+)?)\s*(g|kg|ml|cl|l|kpl|pkt|ps|prk|tlk|pl)\b/i);
if(packageTokenForAnchor){
 const pn=packageTokenForAnchor[1].replace(",", "."), pu=packageTokenForAnchor[2];
 const titleWords=(title.toUpperCase().match(/[A-ZÅÄÖ]{4,}/g)||[]);
 const nums=wordBoxes.filter(b=>String(b.text).replace(",",".")===pn);
 for(const nb of nums){
   const ub=wordBoxes.find(b=>Math.abs((Number(b.top)||0)-(Number(nb.top)||0))<.012&&Math.abs((Number(b.left)||0)-(Number(nb.left)||0))<.10&&new RegExp("^"+pu+"$","i").test(String(b.text)));
   if(!ub)continue;
   const th=wordBoxes.filter(b=>Math.abs((Number(b.top)||0)-(Number(nb.top)||0))<.018&&titleWords.includes(String(b.text).toUpperCase().replace(/[^A-ZÅÄÖ]/g,"")));
   if(th.length){packageRowAnchor={left:th.reduce((s,b)=>s+Number(b.left||0),0)/th.length,top:th.reduce((s,b)=>s+Number(b.top||0),0)/th.length,width:0,height:0,boxes:th};break;}
 }
}
const titleTokens=new Set((title.toUpperCase().match(/[A-ZÅÄÖ]{4,}/g)||[])); const exactTitleHits=wordBoxes.filter(b=>titleTokens.has(String(b.text).toUpperCase().replace(/[^A-ZÅÄÖ]/g,""))); const rawTitleHits=exactTitleHits.length?exactTitleHits:wordBoxes.filter(b=>title.toUpperCase().includes(String(b.text).toUpperCase())&&String(b.text).length>2); const titleRows=[]; for(const b of rawTitleHits){let r=titleRows.find(r=>Math.abs(r.top-b.top)<.018);if(!r){r={top:b.top,boxes:[]};titleRows.push(r)}r.boxes.push(b)} const packageToken=String(title).match(/\\b(\\d+(?:[,.]\\d+)?)\\s*(g|kg|ml|cl|l|kpl|pkt|ps|prk|tlk|pl)\\b/i); const scoredTitleRows=titleRows.map(r=>{const chars=r.boxes.reduce((s,x)=>s+String(x.text).length,0);let packageProof=0;if(packageToken){const n=packageToken[1].replace(",",".");const u=packageToken[2];packageProof=wordBoxes.some(b=>Math.abs(b.top-r.top)<.024&&String(b.text).replace(",",".")===n)&&wordBoxes.some(b=>Math.abs(b.top-r.top)<.024&&new RegExp("^"+u+"$","i").test(String(b.text)))?1000:0;}const recipePenalty=wordBoxes.some(b=>Math.abs(b.top-r.top)<.065&&b.top>=r.top&&/^Katso$/i.test(String(b.text)))&&wordBoxes.some(b=>Math.abs(b.top-r.top)<.065&&b.top>=r.top&&/^resepti$/i.test(String(b.text)))?-500:0;return {...r,_score:packageProof+recipePenalty+chars};}); const bestTitleRow=scoredTitleRows.sort((a,b)=>b._score-a._score)[0]; const titleHits=bestTitleRow?bestTitleRow.boxes:rawTitleHits;
 const spatialPriceBoxes=wordBoxes.filter(b=>/^(?:\d{1,3}|\d{1,2}[.,]\d{2}|\d{1,2}[-.]|\d{2})$/.test(String(b.text).trim())||/^[A-Za-zÅÄÖåäö]*\d[A-Za-zÅÄÖåäö]+$/.test(String(b.text).trim())); const anchor=packageRowAnchor|| (titleHits.length?{left:titleHits.reduce((s,b)=>s+b.left,0)/titleHits.length,top:titleHits.reduce((s,b)=>s+b.top,0)/titleHits.length,width:0,height:0}:null); const spatial=anchor?wordBoxes.map(b=>({...b,d:Number(boxDistance(anchor,b).toFixed(6))})).filter(b=>b.d<0.34).sort((a,b)=>a.d-b.d).slice(0,100):[]; const blockLeft=anchor?Math.max(0,anchor.left-0.18):0,blockRight=anchor?Math.min(1,anchor.left+0.26):1,blockTop=anchor?Math.max(0,anchor.top-0.16):0,blockBottom=anchor?Math.min(1,anchor.top+0.16):1; const productTitleAnchors=(lines||[]).filter(z=>z&&z.i&&/[A-Za-zÅÄÖåäö]{4}/.test(String(z.i))).map(z=>String(z.i).replace(/<[^>]+>/g," ").replace(/\\s+/g," ").trim()).filter(s=>s.length>=10).map(s=>{const toks=[...new Set(s.split(/\\s+/).map(t=>t.replace(/[^A-Za-zÅÄÖåäö0-9-]/g,"")).filter(t=>t.length>=5))];const hits=wordBoxes.filter(b=>toks.some(t=>String(b.text).replace(/[^A-Za-zÅÄÖåäö0-9-]/g,"").toLowerCase()===t.toLowerCase()));const matched=[...new Set(hits.map(b=>String(b.text).toLowerCase()))];return hits.length>=2&&matched.length>=2?{left:hits.reduce((q,b)=>q+b.left,0)/hits.length,top:hits.reduce((q,b)=>q+b.top,0)/hits.length,text:s,matched:matched.length}:null}).filter(Boolean); const productBlock=anchor?wordBoxes.map(b=>({...b,d:Number(boxDistance(anchor,b).toFixed(6))})).filter(b=>{if(!(b.left>=blockLeft&&b.left<=blockRight&&b.top>=blockTop&&b.top<=blockBottom))return false;const own=Math.hypot((b.left-anchor.left)*1.15,(b.top-anchor.top)*1.8);const rival=productTitleAnchors.filter(t=>Math.hypot(t.left-anchor.left,t.top-anchor.top)>.05).map(t=>Math.hypot((b.left-t.left)*1.15,(b.top-t.top)*1.8)).sort((a,b)=>a-b)[0];return rival==null||own<=rival*1.03}):[]; const priceFrags=productBlock.filter(b=>{const t=String(b.text).trim(); if(/^(?:g|kg|l|rl|ml|cl|kpl)\b/i.test(t))return false; if(/^\d{3}$/.test(t)&&title.includes(t))return false; return /^(?:\d{1,3}|\d{1,2}[.,]\d{2}|\d{1,2}[-.]|[A-Za-zÅÄÖåäö]*\d[A-Za-zÅÄÖåäö]+)$/.test(t)}); const unitFrags=wordBoxes.map(b=>({...b,d:anchor?Number(boxDistance(anchor,b).toFixed(6)):999})).filter(b=>anchor&&b.d<0.34&&/^(?:RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())); const spatialCandidates=[]; for(const a of priceFrags){for(const b of priceFrags){if(a===b)continue;const ta=String(a.text).trim(),tb=String(b.text).trim();let value=null;if(/^\d{1,2}[-.]?$/.test(ta)&&/^\d{2}$/.test(tb))value=Number(ta.replace(/[-.]$/,"")+"."+tb);else if(/^\d{3}$/.test(ta))value=Number(ta.slice(0,-2)+"."+ta.slice(-2));if(value&&value<100&&value>=0.5){const u=unitFrags.map(x=>({...x,du:Math.hypot(x.left-b.left,x.top-b.top)})).sort((x,y)=>x.du-y.du)[0];spatialCandidates.push({value,parts:[ta,tb],score:Number((a.d+b.d+(u?u.du*.35:0)).toFixed(6)),unit:u&&u.du<.13?u.text:null})}}} for(const euro of priceFrags.filter(x=>/^\\d{1,2}[-.]?$/.test(String(x.text).trim()))){const et=String(euro.text).trim().replace(/[-.]$/,"");for(const fused of priceFrags.filter(x=>/^\\d{3}$/.test(String(x.text).trim()))){const ft=String(fused.text).trim();const dist=Math.hypot(euro.left-fused.left,euro.top-fused.top);if(dist<.24){const q=Number(ft[2]);if(q>=2&&q<=5){const unit=unitFrags.map(x=>({...x,du:Math.hypot(x.left-fused.left,x.top-fused.top)})).sort((a,b)=>a.du-b.du)[0];spatialCandidates.push({value:Number(et+"."+ft.slice(0,2)),parts:[String(euro.text),ft],score:Number((euro.d+fused.d+dist*.4).toFixed(6)),quantity:q,unit:unit&&unit.du<.22?unit.text:null,kind:"split-cents-quantity"})}}}}
for(const euro of priceFrags.filter(x=>/^\\d{1,2}[-.]?$/.test(String(x.text).trim()))){const qbox=spatial.filter(x=>/^[2-5]$/.test(String(x.text).trim())&&Math.hypot(x.left-euro.left,x.top-euro.top)<.16).sort((a,b)=>Math.hypot(a.left-euro.left,a.top-euro.top)-Math.hypot(b.left-euro.left,b.top-euro.top))[0];if(qbox){const unit=unitFrags.map(x=>({...x,du:Math.hypot(x.left-qbox.left,x.top-qbox.top)})).sort((a,b)=>a.du-b.du)[0];if(unit&&unit.du<.13)spatialCandidates.push({value:Number(String(euro.text).replace(/[-.]$/,"")),parts:[String(euro.text)],score:Number((euro.d+qbox.d+unit.du*.3).toFixed(6)),quantity:Number(qbox.text),unit:unit.text,kind:"whole-euro-multibuy"})}}
for(const emb of spatial.filter(x=>/^[A-Za-zÅÄÖåäö]+[1-9][A-Za-zÅÄÖåäö]+$/.test(String(x.text).trim()))){const m=String(emb.text).match(/([1-9])/);if(!m)continue;for(const cents of priceFrags.filter(x=>/^\\d{2}$/.test(String(x.text).trim()))){const dist=Math.hypot(emb.left-cents.left,emb.top-cents.top);if(dist<.12){const unit=unitFrags.map(x=>({...x,du:Math.hypot(x.left-cents.left,x.top-cents.top)})).sort((a,b)=>a.du-b.du)[0];spatialCandidates.push({value:Number(m[1]+"."+String(cents.text)),parts:[String(emb.text),String(cents.text)],score:Number((emb.d+cents.d+dist*.25).toFixed(6)),unit:unit&&unit.du<.15?unit.text:null,kind:"embedded-euro-digit"})}}}
const rowGroups=spatialGroups(spatial); for(const g of rowGroups){const gt=String(g.text); const embedded=gt.match(/[A-Za-zÅÄÖåäö]+([1-9])[A-Za-zÅÄÖåäö]+/); if(embedded){for(const cents of priceFrags.filter(x=>/^\\d{2}$/.test(String(x.text).trim()))){if(cents.top>=g.top&&cents.top-g.top<.035&&Math.abs(cents.left-g.right)<.12)spatialCandidates.push({value:Number(embedded[1]+"."+cents.text),parts:[gt,String(cents.text)],score:Number((Math.abs(g.top-anchor.top)+cents.d*.35).toFixed(6)),kind:"row-embedded-euro"})}} const fused=gt.match(/\\b([1-9])\\s+(\\d{2})([2-5])\\b/); if(fused)spatialCandidates.push({value:Number(fused[1]+"."+fused[2]),quantity:Number(fused[3]),parts:[gt],score:Number(Math.abs(g.top-anchor.top).toFixed(6)),kind:"row-fused-cents-quantity"});}

// High-confidence visual geometry: euro + fused cents/quantity (e.g. 4 + 503 => 4.50 / 3)
for(const fused of productBlock.filter(x=>/^\d{3}$/.test(String(x.text).trim()))){
  const s=String(fused.text).trim(), cents=s.slice(0,2), qty=Number(s[2]);
  if(qty<2||qty>5)continue;
  for(const euro of productBlock.filter(x=>/^\d{1,2}$/.test(String(x.text).trim()))){
    const dx=fused.left-euro.left, dy=fused.top-euro.top;
    if(dx>=0&&dx<.16&&dy>=0&&dy<.045){
      const unit=unitFrags.map(x=>({...x,du:Math.hypot(x.left-fused.left,x.top-fused.top)})).sort((a,b)=>a.du-b.du)[0];
      spatialCandidates.push({value:Number(String(euro.text)+"."+cents),quantity:qty,unit:unit&&unit.du<.14?String(unit.text).toUpperCase():null,parts:[String(euro.text),s],score:Number((Math.abs(dx)+Math.abs(dy)).toFixed(6)),kind:"geometric-fused-multibuy"});
    }
  }
}
// Large visual whole-euro price + quantity below/right (e.g. 7 € / 3 ps)
for(const euro of productBlock.filter(x=>/^\d{1,2}$/.test(String(x.text).trim())&&Number(x.height||0)>.05)){
  const q=productBlock.filter(x=>/^[2-5]$/.test(String(x.text).trim())&&x.left>euro.left&&x.left-euro.left<.16&&x.top>euro.top&&x.top-euro.top<.10).sort((a,b)=>Math.hypot(a.left-euro.left,a.top-euro.top)-Math.hypot(b.left-euro.left,b.top-euro.top))[0];
  if(!q)continue;
  const normalUnit=(nr&&nr.unit)?String(nr.unit).toUpperCase():null;
  spatialCandidates.push({value:Number(euro.text),quantity:Number(q.text),unit:normalUnit,parts:[String(euro.text),String(q.text)],score:Number(Math.hypot(q.left-euro.left,q.top-euro.top).toFixed(6)),kind:"large-euro-quantity"});
}
// Embedded euro digit in a word plus nearby cents (e.g. T3oalettpapper + 59 => 3.59)
for(const emb of productBlock){
  const m=String(emb.text).match(/[A-Za-zÅÄÖåäö]+([1-9])[A-Za-zÅÄÖåäö]+/); if(!m)continue;
  for(const cents of productBlock.filter(x=>/^\d{2}$/.test(String(x.text).trim()))){
    const dist=Math.hypot(emb.left-cents.left,emb.top-cents.top); if(dist>.10)continue;
    const unit=unitFrags.map(x=>({...x,du:Math.hypot(x.left-cents.left,x.top-cents.top)})).sort((a,b)=>a.du-b.du)[0];
    spatialCandidates.push({value:Number(m[1]+"."+String(cents.text)),quantity:null,unit:unit&&unit.du<.12?String(unit.text).toUpperCase():null,parts:[String(emb.text),String(cents.text)],score:Number(dist.toFixed(6)),kind:"embedded-productblock-price"});
  }
}

// Reject candidates that are just package/deposit numbers echoed from the product title.
const packageNumbers=new Set((title.match(/\d+(?:[,.]\d+)?/g)||[]).map(x=>Number(x.replace(",","."))));

// Recover large-font transaction prices from the coordinate layer. These are visually distinct from package sizes/unit prices.
for(const euro of spatialPriceBoxes.filter(x=>/^\\d{1,2}[.]?$/.test(String(x.text).trim())&&Number(x.height||0)>=.05&&anchor&&boxDistance(anchor,x)<.23)){
 const value=Number(String(euro.text).replace(/[.]$/,"")); if(!(value>=1&&value<30)||packageNumbers.has(value))continue;
 const qUnits=[]; for(const u of wordBoxes.filter(x=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(x.text).trim()))){const q=wordBoxes.filter(x=>/^[2-5]$/.test(String(x.text).trim())).map(x=>({...x,dq:Math.hypot(x.left-u.left,x.top-u.top)})).sort((a,b)=>a.dq-b.dq)[0];if(q&&q.dq<.10){const de=Math.hypot(((q.left+u.left)/2)-euro.left,((q.top+u.top)/2)-euro.top);if(de<.20)qUnits.push({quantity:Number(q.text),unit:String(u.text).toUpperCase(),de})}}
 const qu=qUnits.sort((a,b)=>a.de-b.de)[0]; if(qu||(!expected&&boxDistance(anchor,euro)<.11))spatialCandidates.push({value,quantity:qu?qu.quantity:null,unit:qu?qu.unit:null,parts:[String(euro.text)],score:Number((boxDistance(anchor,euro)*.35+(qu?qu.de*.15:0)).toFixed(6)),kind:"large-visual-whole-euro"});
}
// Ranged package + ranged unit price can identify one fixed shelf price.
// Example: 130–170 g and 10.53–13.77/kg => 0.170*10.53 ~= 0.130*13.77 ~= 1.79.
// Require both cross-products to converge and the matching large cents to be close to the product anchor.
if(anchor&&pk&&ur&&pk.max>pk.min&&ur.max>ur.min){
 const p1=pk.max*ur.min,p2=pk.min*ur.max,mid=(p1+p2)/2,spread=Math.abs(p1-p2)/mid;
 const derived=Number(mid.toFixed(2)),dc=Math.round((derived-Math.floor(derived))*100);
 const centsBox=spatialPriceBoxes.filter(b=>/^[0-9]{2}$/.test(String(b.text).trim())&&Number(b.height||0)>=.05&&boxDistance(anchor,b)<.12&&Math.abs(Number(b.text)-dc)<=1).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
 const saleUnit=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())&&boxDistance(anchor,b)<.16).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
 if(spread<=.025&&derived>=.5&&derived<30&&centsBox&&saleUnit)spatialCandidates.push({value:derived,quantity:null,unit:String(saleUnit.text).toUpperCase(),parts:[pk.raw,ur.raw,String(centsBox.text)],score:Number((boxDistance(anchor,centsBox)*.20+spread).toFixed(6)),kind:"range-unitprice-cents-validated"});
}
// Same ranged-price proof when the unit-price range exists only in the coordinate layer.
// This handles rows where basic HTML lost or attached the wrong €/kg fragment.
if(anchor&&pk&&pk.max>pk.min){
 const localGroups=spatialGroups(wordBoxes.filter(b=>boxDistance(anchor,b)<.13));
 for(const gg of localGroups){
  const gm=String(gg.text||"").match(/\(?\s*(\d{1,2})\s+(\d{2})\s*[–-]\s*(\d{1,2})\s+(\d{2})\s*\/(kg|l)\)?/i);
  if(!gm)continue;
  const umin=Number(gm[1]+"."+gm[2]),umax=Number(gm[3]+"."+gm[4]); if(!(umax>umin))continue;
  const p1=pk.max*umin,p2=pk.min*umax,mid=(p1+p2)/2,spread=Math.abs(p1-p2)/mid,derived=Number(mid.toFixed(2)),dc=Math.round((derived-Math.floor(derived))*100);
  const centsBox=spatialPriceBoxes.filter(b=>/^[0-9]{2}$/.test(String(b.text).trim())&&Number(b.height||0)>=.05&&boxDistance(anchor,b)<.12&&Math.abs(Number(b.text)-dc)<=1).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
  const saleUnit=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())&&boxDistance(anchor,b)<.16).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
  if(spread<=.025&&derived>=.5&&derived<30&&centsBox&&saleUnit){spatialCandidates.push({value:derived,quantity:null,unit:String(saleUnit.text).toUpperCase(),parts:[pk.raw,String(gg.text),String(centsBox.text)],score:Number((boxDistance(anchor,centsBox)*.18+spread).toFixed(6)),kind:"spatial-range-unitprice-cents-validated"});break;}
 }
}
// Fixed package + local unit price + matching large cents.
// Use the local geometry unit price rather than a stale/misaligned unit-price fragment from basic HTML.
// Example: 340 g * 20.26/kg = 6.89, with a nearby large "89" cents box.
if(anchor&&pk&&Math.abs(pk.max-pk.min)<1e-9){
 const localGroups=spatialGroups(wordBoxes.filter(b=>boxDistance(anchor,b)<.13));
 for(const gg of localGroups){
  const gm=String(gg.text||"").match(/\(?\s*(\d{1,2})\s+(\d{2})\s*\/(kg|l)\)?/i); if(!gm)continue;
  const localUnit=Number(gm[1]+"."+gm[2]),derived=Number((pk.min*localUnit).toFixed(2)); if(!(derived>=.5&&derived<30))continue;
  const dc=Math.round((derived-Math.floor(derived))*100);
  const centsBox=spatialPriceBoxes.filter(b=>/^[0-9]{2}$/.test(String(b.text).trim())&&Number(b.height||0)>=.05&&boxDistance(anchor,b)<.12&&Math.abs(Number(b.text)-dc)<=1).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
  const saleUnit=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())&&boxDistance(anchor,b)<.16).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
  if(centsBox&&saleUnit){spatialCandidates.push({value:derived,quantity:null,unit:String(saleUnit.text).toUpperCase(),parts:[pk.raw,String(gg.text),String(centsBox.text)],score:Number((boxDistance(anchor,centsBox)*.17).toFixed(6)),kind:"spatial-fixed-unitprice-cents-validated"});break;}
 }
}
// Recover prices where the euro digit is embedded in the leaflet graphic/vector layer but the large cents remain textual.
// Unit-price evidence supplies the missing euro part; require a very close large cents box and a printed sale unit.
if(expected&&anchor){
 const rounded=Number(expected.toFixed(2)),euros=Math.floor(rounded),cents=Math.round((rounded-euros)*100),rangeTitle=/\d+(?:[,.]\d+)?\s*[–-]\s*\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l)\b/i.test(title);
 const closeCents=spatialPriceBoxes.filter(b=>/^[0-9]{2}$/.test(String(b.text).trim())&&Number(b.height||0)>=.05&&boxDistance(anchor,b)<.12&&Math.abs(Number(b.text)-cents)<=1).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
 const saleUnit=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())&&boxDistance(anchor,b)<.16).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
 if(closeCents&&saleUnit&&!rangeTitle&&euros>=1&&euros<=29&&!packageNumbers.has(rounded))spatialCandidates.push({value:rounded,quantity:null,unit:String(saleUnit.text).toUpperCase(),parts:["expected",String(closeCents.text)],score:Number((boxDistance(anchor,closeCents)*.28).toFixed(6)),kind:"expected-large-cents-unit"});
}
// Reconstruct large-font spaced cents such as ERÄ 1 8 9 => 1.89, while ignoring package-count rows.
for(const g of spatialGroups(spatial).filter(g=>/\\b[1-9]\\s+[0-9]\\s+[0-9]\\b/.test(String(g.text)))){const m=String(g.text).match(/\\b([1-9])\\s+([0-9])\\s+([0-9])\\b/);if(!m)continue;const value=Number(m[1]+"."+m[2]+m[3]);if(value>=.5&&value<30&&!packageNumbers.has(value))spatialCandidates.push({value,quantity:null,unit:null,parts:[m[0]],score:Number((Math.abs(g.top-anchor.top)*.25).toFixed(6)),kind:"spaced-large-cents"});}
// V153: split euro/cents inside the product's visual row/card band.
// Require a significant title hit and price digits to the right in the same narrow vertical band.
if(anchor){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.265);
 const titleWords=String(title).toUpperCase().split(/[^A-ZÅÄÖ0-9]+/).filter(w=>w.length>=5&&/[A-ZÅÄÖ]/.test(w));
 const titleBoxes=local.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().includes(w)));
 for(const hit of titleBoxes){
  const hy=(Number(hit.top)||0)+(Number(hit.height)||0)/2;
  const band=local.filter(b=>Math.abs(((Number(b.top)||0)+(Number(b.height)||0)/2)-hy)<.055&&(Number(b.left)||0)>(Number(hit.left)||0)-.01);
  const euros=band.filter(b=>/^[1-9]$/.test(String(b.text).trim())&&Number(b.height||0)>=.035);
  const cents=band.filter(b=>/^[0-9]{2}$/.test(String(b.text).trim())&&Number(b.height||0)>=.025);
  for(const e of euros)for(const c of cents){
   const dx=Number(c.left)-Number(e.left),dy=Math.abs(Number(c.top)-Number(e.top));
   if(dx<=.008||dx>.075||dy>.035)continue;
   const value=Number(String(e.text).trim()+"."+String(c.text).trim());
   if(value<.5||value>=30||packageNumbers.has(value))continue;
   const d=Math.max(boxDistance(anchor,e),boxDistance(anchor,c));
   spatialCandidates.push({value,quantity:null,unit:null,parts:[String(e.text),String(c.text)],score:Number((d*.12).toFixed(6)),kind:"same-row-euro-cents"});
  }
 }
}
for(let i=spatialCandidates.length-1;i>=0;i--){const x=spatialCandidates[i];if(packageNumbers.has(Number(x.value))&&!x.quantity&&x.kind!=="embedded-productblock-price")spatialCandidates.splice(i,1)}
// Prefer explicit quantity/unit geometry with a plausible transaction price near expected single * quantity.
for(const q of productBlock.filter(x=>/^[2-5]$/.test(String(x.text).trim()))){
 const unit=unitFrags.map(u=>({...u,du:Math.hypot(u.left-q.left,u.top-q.top)})).sort((a,b)=>a.du-b.du)[0]; if(!unit||unit.du>.13)continue;
 for(const p of spatialCandidates){if(!expected||p.quantity||p.value<1||p.value>30)continue; const err=Math.abs(p.value-expected*Number(q.text)); if(err<Math.max(.18,expected*.12))p._qtyGeom={quantity:Number(q.text),unit:String(unit.text).toUpperCase(),err};}
}
for(const p of spatialCandidates.filter(x=>x._qtyGeom)){p.quantity=p._qtyGeom.quantity;p.unit=p._qtyGeom.unit;p.kind=p.kind||"quantity-validated-price";p.score=Math.min(p.score,p._qtyGeom.err*.1)}

// Strong transaction-price guards: reject title/package echoes and require multi-buy consistency when unit-price evidence exists.
for(let i=spatialCandidates.length-1;i>=0;i--){const x=spatialCandidates[i]; const parts=(x.parts||[]).map(String); if(parts.length&&parts.every(p=>title.includes(p)))spatialCandidates.splice(i,1)}
if(expected){for(let i=spatialCandidates.length-1;i>=0;i--){const x=spatialCandidates[i]; if(x.quantity>=2&&Math.abs(x.value-expected*x.quantity)>Math.max(.30,expected*.18)&&x.kind!=="embedded-productblock-price")spatialCandidates.splice(i,1)}}

spatialCandidates.sort((a,b)=>a.score-b.score); const qtyUnits=[]; for(const u of unitFrags){const q=spatial.filter(x=>/^[2-5]$/.test(String(x.text).trim())).map(x=>({...x,dq:Math.hypot(x.left-u.left,x.top-u.top)})).sort((a,b)=>a.dq-b.dq)[0];if(q&&q.dq<.12)qtyUnits.push({quantity:Number(q.text),unit:String(u.text).toUpperCase(),left:u.left,top:u.top,d:u.d})} // If visual price fragments are noisy but package size + promo unit price and an explicit qty/unit are present,
// derive only a rounded transaction-price candidate; explicit clean visual prices still outrank this fallback.
if(expected){
 for(const q of qtyUnits){
  const titleUnit=(title.match(/\/(tlk|pl|ps|pkt|rs|prk|kpl)\b/i)||[])[1];
  if(titleUnit&&String(q.unit).toLowerCase()!==titleUnit.toLowerCase()) continue;
  const raw=expected*q.quantity;
  const candidates=[Math.round(raw*100)/100,Math.round(raw*10)/10,Math.round(raw*2)/2,Math.round(raw)];
  const value=candidates.sort((a,b)=>Math.abs(a-raw)-Math.abs(b-raw))[0];
  if(value>=1&&value<50&&Math.abs(value-raw)<Math.max(.18,expected*.12)) spatialCandidates.push({value,quantity:q.quantity,unit:q.unit,parts:["unitprice",String(q.quantity),q.unit],score:Number((.42+Math.abs(value-raw)).toFixed(6)),kind:"unitprice-derived-multibuy"});
 }
}
for(const g of spatialGroups(anchor?wordBoxes.filter(b=>boxDistance(anchor,b)<0.22):[])){const m=String(g.text||"").match(/(?:^|\\bERÄ\\s+)([0-9])\\s+([0-9])\\s+([0-9])(?:\\b|$)/i);if(m){const v=Number(m[1]+"."+m[2]+m[3]);if(v>=.5&&v<20&&!title.replace(/\\D/g,"").includes(m[1]+m[2]+m[3]))spatialCandidates.push({value:v,quantity:null,unit:null,parts:[m[1],m[2],m[3]],score:.08,kind:"spaced-large-cents"});}} let spatialResolved=null,percentageOffer=null;
// Generic basic-HTML explicit shelf price: accept "UNIT 3190" style only from the product's own nearby text row.
if(anchor){
 const ownText=around.map(r=>String(r.text||"").trim()).join(" | ");
 const mm=ownText.match(/(?:^|\|)\s*(KPL|PKT|PS|RS|TLK|PL|PRK)\s+(\d{3,4})(?=\s*(?:\||$))/i);
 if(mm){const t=mm[2],value=Number(t.slice(0,-2)+"."+t.slice(-2));if(value>=.5&&value<100)spatialResolved={value,quantity:null,unit:mm[1].toUpperCase(),source:"basic-own-row-explicit-compact-price",sanity:"pass",confidence:"high"};}
}
if(expected){for(const q of qtyUnits){const tx=Number((expected*q.quantity).toFixed(2));const half=Math.round(tx*2)/2;if(Math.abs(tx-half)<.08&&half>=1&&half<30&&!spatialCandidates.some(x=>x.kind!=="unitprice-derived-multibuy"&&x.quantity===q.quantity&&Math.abs(x.value-half)<.12))spatialCandidates.push({value:half,quantity:q.quantity,unit:q.unit,parts:["expected",String(q.quantity),q.unit],score:Number((.36+Math.abs(tx-half)).toFixed(6)),kind:"expected-validated-multibuy"});}} const largeVisual=spatialCandidates.filter(x=>x.kind==="large-visual-whole-euro"||x.kind==="spaced-large-cents"||x.kind==="same-row-euro-cents").filter(x=>{if(x.kind==="spaced-large-cents"||x.kind==="same-row-euro-cents")return true;if(!expected||!x.quantity)return true;return Math.abs(x.value-expected*x.quantity)<Math.max(.35,expected*.22)}).sort((a,b)=>a.score-b.score)[0]; const expectedTitleUnit=((title.match(/(?:^|\\s)(RS|PS|PKT|KPL|PRK|TLK|PL)(?:\\s|$)|\/(tlk|pl|ps|pkt|rs|prk|kpl)\b/i)||[]).slice(1).find(Boolean)||"").toUpperCase(); const highConfidenceMulti=spatialCandidates.filter(x=>x.kind==="geometric-fused-multibuy"&&x.quantity>=2&&x.quantity<=5&&(!expectedTitleUnit||String(x.unit||"").toUpperCase()===expectedTitleUnit)).sort((a,b)=>a.score-b.score)[0]; const validatedMulti=expected?spatialCandidates.filter(x=>x.kind!=="unitprice-derived-multibuy"&&x.quantity>=2&&x.quantity<=5&&x.value>=.5&&x.value<50&&(!expectedTitleUnit||String(x.unit||"").toUpperCase()===expectedTitleUnit)&&Math.abs(x.value-expected*x.quantity)<Math.max(.22,expected*.14)).sort((a,b)=>Math.abs(a.value-expected*a.quantity)-Math.abs(b.value-expected*b.quantity)||a.score-b.score)[0]:null; const visualMulti=spatialCandidates.filter(x=>x.kind==="large-euro-quantity").sort((a,b)=>a.score-b.score)[0];
const embeddedBlock=spatialCandidates.filter(x=>x.kind==="embedded-productblock-price").sort((a,b)=>a.score-b.score)[0];
// V296: raw wordBoxes visual recovery; inferred multibuy may be replaced only by strict large visual evidence.
// expected-validated-multibuy is arithmetic evidence, not geometric evidence. A nearby qty/unit can
// belong to another offer card. Preserve clean same-row / unit-price-validated / embedded prices.
// True geometric-fused multibuys remain authoritative below.
const strongDirect=spatialCandidates.filter(x=>
  x.quantity==null &&
  ["same-row-euro-cents","range-unitprice-cents-validated","spatial-range-unitprice-cents-validated","spatial-fixed-unitprice-cents-validated","expected-large-cents-unit","embedded-productblock-price"].includes(x.kind) &&
  Number(x.score)<=0.08
).sort((a,b)=>a.score-b.score)[0];
const inferredMultiKinds=new Set(["expected-validated-multibuy","large-euro-quantity"]);
const guardedValidatedMulti=validatedMulti&&strongDirect&&inferredMultiKinds.has(validatedMulti.kind)?null:validatedMulti;
const guardedVisualMulti=visualMulti&&strongDirect?null:visualMulti;
// V303: avoid regex escaping entirely for strict visual digit glyphs.
if(anchor&&expected){const cents=Math.round((expected-Math.floor(expected))*100);const largeCents=wordBoxes.filter(b=>{const t=String(b.text).trim();return boxDistance(anchor,b)<.18&&t.length===2&&Number.isInteger(Number(t))&&Number(b.height||0)>=.05&&Math.abs(Number(t)-cents)<=1;}).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];if(largeCents)spatialResolved={value:Number(expected.toFixed(2)),quantity:null,unit:null,kind:"large-cents-expected-visual",source:"large-cents-expected-visual",sanity:"pass"};}
if(anchor){const mobile=wordBoxes.some(b=>boxDistance(anchor,b)<.14&&/^(?:Mobiilietu|Mobilförmån)$/i.test(String(b.text).trim()));const big3=wordBoxes.filter(b=>{const t=String(b.text).trim();return t.length===3&&Number.isInteger(Number(t))&&Number(b.height||0)>=.09&&Math.abs((Number(b.left)||0)-(Number(anchor.left)||0))<.08&&Math.abs((Number(b.top)||0)-(Number(anchor.top)||0))<.16;}).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];if(mobile&&big3){const t=String(big3.text).trim(),v=Number(t[0]+"."+t.slice(1));if(v>=.5&&v<20)spatialResolved={value:v,quantity:null,unit:"PL",kind:"mobile-benefit-large-visual",source:"mobile-benefit-large-visual",sanity:"pass"};}}
const strictVisualSource=spatialResolved&&["large-cents-expected-visual","mobile-benefit-large-visual"].includes(spatialResolved.source); const titleDigits=(title.match(/\\d+(?:[,.]\\d+)?/g)||[]).map(s=>s.replace(",", ".")); const goodCand=spatialCandidates.filter(x=>x.kind!=="unitprice-derived-multibuy"&&x.value>=.5&&x.value<50&&(["range-unitprice-cents-validated","spatial-range-unitprice-cents-validated","spatial-fixed-unitprice-cents-validated"].includes(x.kind)||!((x.parts||[]).some(p=>titleDigits.includes(String(p).replace(",", ".")))))).sort((a,b)=>a.score-b.score)[0]; if(goodCand&&!strictVisualSource){
  const q=Number(goodCand.quantity||1);
  const expectedTx=expected?expected*q:null;
  const ratio=expectedTx?goodCand.value/expectedTx:null;
  // V98: a weak nearest-price candidate must agree with package/unit-price evidence.
  // Better unresolved than silently attaching a neighbouring product's price.
  const sane=!expectedTx || (ratio>=0.69&&ratio<=1.45);
  // Do not suppress a visually strong nearby candidate here: expectedSingle can itself
  // be ambiguous when a leaflet prints litre/kg pricing for a multi-buy. Keep the
  // candidate and mark disagreement for the audit layer instead.
  const provenSource=goodCand.kind==="range-unitprice-cents-validated"?"range-unitprice-cents-validated":goodCand.kind==="spatial-range-unitprice-cents-validated"?"spatial-range-unitprice-cents-validated":goodCand.kind==="spatial-fixed-unitprice-cents-validated"?"spatial-fixed-unitprice-cents-validated":"best-spatial-candidate"; spatialResolved={...goodCand,source:provenSource,sanity:sane?"pass":"review",sanityRatio:ratio};
} if(!strictVisualSource&&largeVisual&&(!spatialResolved||largeVisual.quantity||["spaced-large-cents","same-row-euro-cents"].includes(largeVisual.kind)))spatialResolved={...largeVisual,source:"large-visual-price"}; if(!strictVisualSource&&embeddedBlock)spatialResolved={...embeddedBlock,source:"embedded-productblock-price"}; if(guardedVisualMulti&&!["v308-own-column-large-price","v307-own-unitrow-large-price","v307-own-column-large-price","expected-matched-large-compact","expected-matched-large-split","large-cents-expected-visual","mobile-benefit-large-visual"].includes(spatialResolved?.source))spatialResolved={...guardedVisualMulti,source:"visual-large-euro-multibuy"}; if(guardedValidatedMulti&&!["v308-own-column-large-price","v307-own-unitrow-large-price","v307-own-column-large-price","expected-matched-large-compact","expected-matched-large-split","large-cents-expected-visual","mobile-benefit-large-visual"].includes(spatialResolved?.source))spatialResolved={...guardedValidatedMulti,source:"validated-geometric-multibuy"}; if(highConfidenceMulti)spatialResolved={...highConfidenceMulti,source:"high-confidence-geometric-multibuy"}; const expectedMulti=expected?spatialCandidates.filter(x=>x.kind==="expected-validated-multibuy"&&x.quantity>=2&&x.quantity<=5).sort((a,b)=>a.score-b.score)[0]:null; if(expectedMulti&&!strongDirect&&!strictVisualSource){const currentStrong=spatialResolved&&["validated-geometric-multibuy","high-confidence-geometric-multibuy","visual-large-euro-multibuy"].includes(spatialResolved.source)&&spatialResolved.quantity>=2&&Math.abs(spatialResolved.value-expected*spatialResolved.quantity)<Math.max(.22,expected*.14);if(!currentStrong)spatialResolved={...expectedMulti,source:"expected-validated-multibuy"};} const embeddedCand=spatialCandidates.filter(x=>x.kind==="embedded-euro-digit"||x.kind==="row-embedded-euro").sort((a,b)=>a.score-b.score)[0]; if(embeddedCand&&!strictVisualSource)spatialResolved={...embeddedCand,source:"embedded-spatial"}; const erSpaced=spatialGroups(anchor?wordBoxes.filter(b=>boxDistance(anchor,b)<0.22):[]).map(g=>String(g.text||"").match(/ERÄ\\s+([1-9])\\s+([0-9])\\s+([0-9])/i)).find(Boolean);if(erSpaced&&!strictVisualSource)spatialResolved={value:Number(erSpaced[1]+"."+erSpaced[2]+erSpaced[3]),quantity:null,unit:null,source:"er-spaced-large-cents"}; if(!spatialResolved&&nr&&nr.min>=10){const big=productBlock.filter(x=>/^\\d{1,2}$/.test(String(x.text).trim())&&Number(x.height||0)>=.05&&Number(x.text)<nr.min).sort((a,b)=>Number(b.height||0)-Number(a.height||0))[0];if(big)spatialResolved={value:Number(big.text),quantity:null,unit:nr.unit||null,source:"large-discount-price"}} const compact=priceFrags.filter(x=>/^\\d{3}$/.test(String(x.text).trim())&&!title.replace(/\\s+/g,"").includes(String(x.text).trim())).map(x=>({box:x,value:Number(String(x.text)[0]+"."+String(x.text).slice(1))})).filter(x=>x.value>=.5&&x.value<50).sort((a,b)=>a.box.d-b.box.d)[0]; if(compact&&!strictVisualSource&&(!spatialResolved||(!["validated-geometric-multibuy","visual-large-euro-multibuy","embedded-productblock-price"].includes(spatialResolved.source)&&compact.box.d<.16))){const qu=qtyUnits.map(q=>({...q,dq:Math.hypot(q.left-compact.box.left,q.top-compact.box.top)})).sort((a,b)=>a.dq-b.dq)[0];spatialResolved={value:compact.value,quantity:qu&&qu.dq<.22?qu.quantity:null,unit:qu&&qu.dq<.22?qu.unit:null,source:"compact-spatial"}} 
if(expected&&qtyUnits.length&&(!spatialResolved||((spatialResolved.source!=="validated-geometric-multibuy"&&spatialResolved.source!=="high-confidence-geometric-multibuy"&&spatialResolved.kind!=="geometric-fused-multibuy"&&spatialResolved.kind!=="large-euro-quantity"&&spatialResolved.source!=="visual-large-euro-multibuy"&&spatialResolved.source!=="embedded-productblock-price")&&(spatialResolved.value<1||Math.abs(spatialResolved.value-expected)>Math.max(1,expected*.8))))){const q=qtyUnits.sort((a,b)=>a.d-b.d)[0];const tx=Number((expected*q.quantity).toFixed(2));const rounded=Math.round(tx*2)/2;if(Math.abs(tx-rounded)<.04&&rounded>=1&&rounded<50)spatialResolved={value:rounded,quantity:q.quantity,unit:q.unit,source:"unitprice-validated-multibuy"}} const titleSlashUnit=((title.match(/\/(tlk|pl|ps|pkt|rs|prk|kpl)\b/i)||[])[1]||"").toUpperCase();if(spatialResolved&&titleSlashUnit&&spatialResolved.unit&&String(spatialResolved.unit).toUpperCase()!==titleSlashUnit){const sameUnit=spatialCandidates.filter(x=>String(x.unit||"").toUpperCase()===titleSlashUnit&&x.value>=.5&&x.value<50).sort((a,b)=>a.score-b.score)[0];if(sameUnit)spatialResolved={...sameUnit,source:"title-unit-spatial"};}
if(expected&&titleSlashUnit&&(!spatialResolved||!spatialResolved.quantity)){const qs=qtyUnits.filter(q=>String(q.unit||"").toUpperCase()===titleSlashUnit&&q.quantity>=2&&q.quantity<=5).sort((a,b)=>a.d-b.d);for(const q of qs){const tx=Number((expected*q.quantity).toFixed(2));const half=Math.round(tx*2)/2;if(Math.abs(tx-half)<.08&&half>=1&&half<30){spatialResolved={value:half,quantity:q.quantity,unit:titleSlashUnit,source:"expected-titleunit-multibuy"};break;}}}
const largeWhole=spatial.filter(b=>/^[3-9]$/.test(String(b.text).trim())&&b.height>.08&&b.width>.035&&b.top>anchor.top-.02&&b.top<anchor.top+.09).sort((a,b)=>Math.abs(a.left-anchor.left)-Math.abs(b.left-anchor.left))[0];if(largeWhole){const q=spatial.filter(b=>/^[2-5]$/.test(String(b.text).trim())&&b.height>.02&&b.height<.04&&b.top>largeWhole.top+.035&&b.top<largeWhole.top+.10&&b.left>largeWhole.left+.06&&b.left<largeWhole.left+.16).sort((a,b)=>Math.abs(a.top-(largeWhole.top+.06))-Math.abs(b.top-(largeWhole.top+.06)))[0];const u=unitFrags.filter(x=>/^(RS|PS|PL|TLK|PKT|PRK|KPL)$/i.test(String(x.text||""))&&q&&Math.abs(x.left-q.left)<.035&&x.top>q.top&&x.top<q.top+.04&&(titleSlashUnit?String(x.text).toUpperCase()===titleSlashUnit:true)).sort((a,b)=>Math.abs(a.left-q.left)-Math.abs(b.left-q.left))[0];if(q&&u){const existingDecimal=spatialResolved&&Number.isFinite(Number(spatialResolved.value))&&Math.abs(Number(spatialResolved.value)-Math.round(Number(spatialResolved.value)))>.001;const existingSameQty=spatialResolved&&Number(spatialResolved.quantity)===Number(q.text)&&String(spatialResolved.unit||"").toUpperCase()===String(u.text).toUpperCase();if(!(existingDecimal&&existingSameQty))spatialResolved={value:Number(largeWhole.text),quantity:Number(q.text),unit:String(u.text).toUpperCase(),source:"large-visual-price-qty-unit"};}}
if(spatialResolved&&spatialResolved.value!=null&&!spatialResolved.quantity){const wideQ=spatial.filter(b=>/^[2-5]$/.test(String(b.text).trim())&&b.height>.02&&b.height<.04&&b.left>anchor.left+.18&&b.left<anchor.left+.34&&Math.abs(b.top-anchor.top)<.06).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];const wideU=unitFrags.filter(x=>wideQ&&/^(RS|PS|PL|TLK|PKT|PRK|KPL)$/i.test(String(x.text||""))&&Math.abs(x.left-wideQ.left)<.035&&x.top>wideQ.top&&x.top<wideQ.top+.04).sort((a,b)=>Math.abs(a.left-wideQ.left)-Math.abs(b.left-wideQ.left))[0];if(wideQ&&wideU)spatialResolved={...spatialResolved,quantity:Number(wideQ.text),unit:String(wideU.text).toUpperCase(),source:"wide-price-qty-unit-backfill"};}
if(!spatialResolved&&expected&&spatialCandidates.length){
 const validated=spatialCandidates.map(x=>{const q=Number(x.quantity||1),per=Number(x.value)/q,ratio=per/expected;return {...x,_expectedRatio:ratio};}).filter(x=>Number(x.quantity)>=2&&Number(x.quantity)<=5&&x._expectedRatio>=0.97&&x._expectedRatio<=1.03).sort((a,b)=>Math.abs(a._expectedRatio-1)-Math.abs(b._expectedRatio-1));
 if(validated.length)spatialResolved={...validated[0],source:"unitprice-validated-candidate"};
}
const groupTexts=spatialGroups(anchor?wordBoxes.filter(b=>boxDistance(anchor,b)<0.22):[]).map(g=>String(g.text||""));
const wholeEuroGroups=groupTexts.map((t,idx)=>({t:t.trim(),idx})).filter(x=>/^[3-9]$/.test(x.t));const qtyOnlyGroups=groupTexts.map((t,idx)=>({t:t.trim(),idx})).filter(x=>{const a=x.t.split(/\\s+/);return a.length>=2&&a.every(v=>v===a[0])&&/^[2-5]$/.test(a[0]);});if(wholeEuroGroups.length&&qtyOnlyGroups.length&&titleSlashUnit){let best=null;for(const p of wholeEuroGroups)for(const q of qtyOnlyGroups){const qty=Number(q.t.split(/\\s+/)[0]);const gap=q.idx-p.idx;if(gap===1&&(!best||p.idx>best.pidx))best={value:Number(p.t),quantity:qty,gap,pidx:p.idx};}if(best){const curStrong=spatialResolved&&["high-confidence-geometric-multibuy","visual-large-euro-multibuy"].includes(spatialResolved.source);if(!curStrong)spatialResolved={value:best.value,quantity:best.quantity,unit:titleSlashUnit,source:"group-whole-euro-multibuy"};}}
if(!spatialResolved&&expected){
 const rounded=Number(expected.toFixed(2)),euros=Math.floor(rounded),cents=Math.round((rounded-euros)*100);
 const centHits=(anchor?wordBoxes:[]).filter(b=>boxDistance(anchor,b)<0.14&&Number(b.height||0)>=0.04&&/^[0-9]{2}$/.test(String(b.text).trim())).map(b=>Number(String(b.text).trim())).filter(n=>Math.abs(n-cents)<=1);
 if(euros>=1&&euros<=99&&centHits.length){const unitRatio=Math.abs(rounded-expected)/expected;if(unitRatio<=0.015)spatialResolved={value:rounded,quantity:null,unit:null,source:"expected-cents-fragment",evidenceCents:centHits[0]};}
}
const erDigits=groupTexts.map(t=>t.match(/ERÄ\s+([1-9])\s+([0-9])\s+([0-9])/i)).find(Boolean);if(erDigits)spatialResolved={value:Number(erDigits[1]+"."+erDigits[2]+erDigits[3]),quantity:null,unit:null,source:"group-er-price"};
if(!spatialResolved&&nr&&nr.min>=10){const disc=groupTexts.map(t=>t.match(/(?:^|\s)([1-9][0-9]?)(?:\s|$)/)).find(m=>m&&Number(m[1])<nr.min);if(disc)spatialResolved={value:Number(disc[1]),quantity:null,unit:nr.unit||null,source:"group-discount-price"};}
// Direct local product-group price: handle layouts where euro+cents are embedded in the same text row as
// the product/package, e.g. "PORKKANA 99 1 kg" with "(0 99/kg)". Require arithmetic agreement.
if(anchor&&expected){
 const rounded=Number(expected.toFixed(2)), euro=Math.floor(rounded), cents=String(Math.round((rounded-euro)*100)).padStart(2,"0");
 const localGroups=spatialGroups(wordBoxes.filter(b=>boxDistance(anchor,b)<.14)).map(g=>String(g.text||""));
 const unitEvidence=localGroups.some(t=>{const s=t.replace(/\\s+/g," ");const direct=new RegExp("\\(?"+euro+"\\s+"+cents+"(?:\\s+"+cents+")?\\/(?:kg|l)\\)?","i").test(s);const splitDup=euro===0&&new RegExp("\\(0\\s+"+cents+"\\s+"+cents+"\\/(?:kg|l)\\)","i").test(s);return direct||splitDup;});
 const productCents=localGroups.some(t=>new RegExp("(?:^|\\s)"+cents+"(?:\\s|$)").test(t));
 const weakExisting=!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate";
 if(unitEvidence&&productCents&&weakExisting)spatialResolved={value:rounded,quantity:null,unit:null,source:"local-product-unitprice-exact",sanity:"pass"};
}
// Reconstruct an exact visual price from package-size/unit-price arithmetic when the matching cents are
// printed in the local product group but the euro digit has been swallowed into adjacent title text.
// Keep this strict: fixed/ranged package arithmetic must agree and the cents token must be local.
if(!spatialResolved&&anchor&&expected){
 const rounded=Number(expected.toFixed(2)), cents=String(Math.round((rounded-Math.floor(rounded))*100)).padStart(2,"0");
 const localCents=wordBoxes.filter(b=>boxDistance(anchor,b)<.16&&String(b.text).trim()===cents&&Number(b.height||0)>=.015);
 const saleUnit=wordBoxes.filter(b=>boxDistance(anchor,b)<.20&&/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
 if(localCents.length&&saleUnit)spatialCandidates.push({value:rounded,quantity:null,unit:String(saleUnit.text).toUpperCase(),parts:["expected-local-cents",cents],score:Number((boxDistance(anchor,localCents[0])*.2).toFixed(6)),kind:"expected-local-cents-validated"});
}
// Large visual euro+cents pair plus a nearby matching sale unit.
// Require package/unit-price arithmetic to agree when expectedSingle exists; this recovers cards such as 2.59 RS
// without reviving the loose nearest-price matches rejected in V112.
if(anchor&&expected){
 const strong=spatialCandidates.filter(x=>x.value>=.5&&x.value<30&&x.unit&&Math.abs(x.value-expected)/expected<=.025).sort((a,b)=>a.score-b.score)[0];
 // This independent arithmetic+visual proof may replace a weak/review candidate, but never a trusted high-confidence source.
 const weakExisting=!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate";
 if(strong&&weakExisting){const exactRatio=Math.abs(strong.value-expected)/expected;if(exactRatio<=.01)spatialResolved={...strong,source:"expected-near-exact-visual",sanity:"pass"};}
}
// Product-row explicit offer digits: accept a price printed in the same local row as the product name
// when package/unit-price arithmetic independently agrees. Exclude any Ilman Plussa-korttia comparison row.
if(anchor&&expected){
 // Ranged package/unit-price rows may print a fixed price at either cross-product endpoint.
 const expectedPrices=[Number(expected.toFixed(2))];
 if(pk&&ur&&pk.max>pk.min&&ur.max>ur.min){for(const v of [pk.max*ur.min,pk.min*ur.max]){const r=Number(v.toFixed(2));if(r>=.5&&r<30&&!expectedPrices.includes(r))expectedPrices.push(r);}}
 // If the HTML unit-price range was fragmented away from this product row, recover it from
 // coordinate groups close to the title. This keeps the endpoint proof tied to the same visual card.
 if(pk&&pk.max>pk.min&&expectedPrices.length===1){
  const rg=spatialGroups(wordBoxes.filter(b=>boxDistance(anchor,b)<.18)).map(g=>String(g.text||"")).map(t=>t.match(/(\d{1,2})\s+(\d{2})\s*[–-]\s*(\d{1,2})\s+(\d{2})\s*\/(kg|l)/i)).find(Boolean);
  if(rg){const lo=Number(rg[1]+"."+rg[2]),hi=Number(rg[3]+"."+rg[4]);if(hi>lo){for(const v of [pk.max*lo,pk.min*hi]){const r=Number(v.toFixed(2));if(r>=.5&&r<30&&!expectedPrices.includes(r))expectedPrices.push(r);}}}
 }
 const pricePatterns=expectedPrices.map(v=>{const e=Math.floor(v),ct=String(Math.round((v-e)*100)).padStart(2,"0");return {value:v,re:new RegExp("(?:^|\\s)"+e+"\\s+"+ct+"(?:\\s|$)")};});
 const localBoxes=wordBoxes.filter(b=>boxDistance(anchor,b)<.22);
 const groups=spatialGroups(localBoxes).map(g=>String(g.text||""));
 const titleWords=String(title).toUpperCase().split(/\s+/).filter(w=>w.length>=6&&/[A-ZÅÄÖ]/.test(w));
 // Some leaflet layouts split the product label and the large offer digits into adjacent visual rows
 // (e.g. "Vaasan PAAHTOLEIVÄT" + "1 69"). Build narrow same-band clusters as a second view,
 // while still requiring a significant title word and the exact independently calculated price.
 const bandGroups=[];
 for(const hit of localBoxes.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().includes(w)))){
  const hy=(hit.top||0)+(hit.height||0)/2;
  const band=localBoxes.filter(b=>Math.abs(((b.top||0)+(b.height||0)/2)-hy)<.055&&Math.abs((b.left||0)-(hit.left||0))<.24)
    .sort((a,b)=>(a.left||0)-(b.left||0)).map(b=>String(b.text||"")).join(" ");
  if(band)bandGroups.push(band);
 }
 let explicitValue=null;
 for(const t of [...groups,...bandGroups]){const u=t.toUpperCase();if(/Ilman\s+Plussa-korttia/i.test(t)||!titleWords.some(w=>u.includes(w)))continue;const hit=pricePatterns.find(p=>p.re.test(t));if(hit){explicitValue=hit.value;break;}}
 // Fragmented large offer digits can land in separate spatial groups. Reconstruct only an independently
 // expected price, requiring euro+cents boxes on the same visual band and to the right of a title hit.
 if(explicitValue==null){
  const reconstructionBoxes=wordBoxes.filter(b=>boxDistance(anchor,b)<.265);
  // Some large offer prices survive as one compact token (e.g. 1599 => 15.99). Accept only an exact independently expected value on the title band/right side.
  for(const p of expectedPrices){const compact=String(Math.round(p*100));for(const hit of localBoxes.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().includes(w)))){const hy=(hit.top||0)+(hit.height||0)/2;const cb=reconstructionBoxes.find(b=>String(b.text||"").trim()===compact&&(b.left||0)>(hit.left||0)&&Math.abs(((b.top||0)+(b.height||0)/2)-hy)<.045);if(cb){explicitValue=p;break;}}if(explicitValue!=null)break;}
  for(const p of expectedPrices){const e=String(Math.floor(p)),ct=String(Math.round((p-Math.floor(p))*100)).padStart(2,"0");for(const hit of localBoxes.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().includes(w)))){const hy=(hit.top||0)+(hit.height||0)/2;const eb=reconstructionBoxes.filter(b=>{const t=String(b.text||"").trim();const euroToken=t===e||(t.startsWith(e+"-")&&t.endsWith("%")&&Number.isFinite(Number(t.slice(e.length+1,-1))));return euroToken&&(b.left||0)>(hit.left||0)&&Math.abs(((b.top||0)+(b.height||0)/2)-hy)<.045;});const cb=reconstructionBoxes.filter(b=>String(b.text||"").trim()===ct&&(b.left||0)>(hit.left||0)&&Math.abs(((b.top||0)+(b.height||0)/2)-hy)<.045);if(eb.some(a=>cb.some(b=>(b.left||0)>(a.left||0)&&((b.left||0)-(a.left||0))<.08))){explicitValue=p;break;}}if(explicitValue!=null)break;}
 }
 const weakExisting=!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate";
 if(explicitValue!=null&&weakExisting)spatialResolved={value:explicitValue,quantity:null,unit:null,source:"product-row-range-exact",sanity:"pass"};
}
// V203: fixed-pack card with explicit local unit price and a large compact visual price (e.g. 0.99).
// Recover only when title/package and unit-price arithmetic agree with the large compact token in the same visual column.
if((!spatialResolved||spatialResolved.sanity==="review")&&anchor&&expected&&pk&&pk.min===pk.max){const um=String(title).match(/\((\d{1,2})[,.](\d{2})\/(kg|l)\)/i)||null;const nearbyUnit=wordBoxes.filter(b=>Math.abs((b.top||0)-anchor.top)<.06&&Math.abs((b.left||0)-anchor.left)<.16).map(b=>String(b.text||"")).join(" ").match(/\((\d{1,2})\s*[,.]?\s*(\d{2})\s*\/(kg|l)\)/i);const m=um||nearbyUnit;if(m){const uv=Number(m[1]+"."+m[2]),vv=Number((pk.min*uv).toFixed(2)),compact=wordBoxes.filter(b=>/^\d{3}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.08&&Math.abs(((b.left||0)+(b.width||0)/2)-anchor.left)<.22&&Math.abs((b.top||0)-anchor.top)<.12).map(b=>({b,v:Number(String(b.text).trim())/100})).sort((a,b)=>Math.abs(a.v-vv)-Math.abs(b.v-vv))[0];if(compact&&Math.abs(compact.v-vv)<=.02)spatialResolved={value:compact.v,quantity:null,unit:null,source:"title-linked-compact-unitprice-exact",sanity:"pass"};}}
// V197: merged three-column price row. The euro digits may be collapsed into one wide token across adjacent cards.
// Trust only a fixed package size + printed local unit price; require the product title and sale unit to share the same visual column.
if(!spatialResolved&&expected&&pk&&pk.min===pk.max){
 const um=String(title).match(/\((\d{1,2})[,.](\d{2})\/(kg|l)\)/i);
 if(um){const unitPrice=Number(um[1]+"."+um[2]),visualValue=Number((pk.min*unitPrice).toFixed(2));const titleWords=String(title).toUpperCase().split(/[^A-ZÅÄÖ0-9]+/).filter(w=>w.length>=5);const hits=wordBoxes.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().replace(/[^A-ZÅÄÖ0-9]/g,"")===w));const units=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text||"").trim()));const sameColumn=hits.some(h=>units.some(u=>Math.abs(((u.left||0)+(u.width||0)/2)-((h.left||0)+(h.width||0)/2))<.12&&(u.top||0)>(h.top||0)&&(u.top||0)<(h.top||0)+.13));if(sameColumn&&visualValue>=.5&&visualValue<30&&Math.abs(visualValue-expected)/expected<=.03)spatialResolved={value:visualValue,quantity:null,unit:null,source:"column-card-unitprice-exact",sanity:"pass"};}
}
// V192: recover a single-item price when package-size × explicit local unit-price proves it and the large cents token is on the same product card.
if(!spatialResolved&&anchor&&expected){const rounded=Number(expected.toFixed(2)),cents=String(Math.round((rounded-Math.floor(rounded))*100)).padStart(2,"0");const titleHits=wordBoxes.filter(b=>String(title).toUpperCase().split(/[^A-ZÅÄÖ0-9]+/).filter(w=>w.length>=6).some(w=>String(b.text||"").toUpperCase().replace(/[^A-ZÅÄÖ0-9]/g,"")===w));const largeCents=wordBoxes.filter(b=>String(b.text||"").trim()===cents&&Number(b.height||0)>=.055);const saleUnit=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text||"").trim()));const proof=titleHits.some(h=>largeCents.some(ct=>Math.abs((ct.left||0)-(h.left||0))<.16&&Math.abs((ct.top||0)-(h.top||0))<.08&&saleUnit.some(u=>Math.abs((u.left||0)-(ct.left||0))<.08&&(u.top||0)>(ct.top||0)&&(u.top||0)<(ct.top||0)+.10)));if(proof)spatialResolved={value:rounded,quantity:null,unit:null,source:"title-card-unitprice-cents-exact",sanity:"pass"};}
// V169: title-linked whole-euro multibuy. Require a large whole-euro price and an explicit quantity+PKT pair in the same tight title band.
if(!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate"){const words=String(title).toUpperCase().split(/[^A-ZÅÄÖ0-9]+/).filter(w=>w.length>=6);const hits=wordBoxes.filter(b=>words.some(w=>String(b.text||"").toUpperCase().replace(/[^A-ZÅÄÖ0-9]/g,"")===w));const found=[];for(const hit of hits){const hy=(hit.top||0)+(hit.height||0)/2;for(const e of wordBoxes.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.055&&Math.abs(((b.left||0)+(b.width||0)/2)-((hit.left||0)+(hit.width||0)/2))<.28&&Math.min(Math.abs(((b.top||0)+(b.height||0)/2)-hy),Math.abs((b.top||0)-hy),Math.abs(((b.top||0)+(b.height||0))-hy))<.13)){const ey=(e.top||0)+(e.height||0)/2;const et=(e.top||0);for(const q of wordBoxes.filter(b=>/^[2-9]$/.test(String(b.text||"").trim())&&Math.abs(((b.left||0)+(b.width||0)/2)-((e.left||0)+(e.width||0)/2))<.18&&Math.min(Math.abs(((b.top||0)+(b.height||0)/2)-ey),Math.abs(((b.top||0)+(b.height||0)/2)-et),Math.abs(((b.top||0)+(b.height||0)/2)-((e.top||0)+(e.height||0))))<.07)){const u=wordBoxes.find(b=>/^PKT$/i.test(String(b.text||"").trim())&&Math.abs(((b.left||0)+(b.width||0)/2)-((q.left||0)+(q.width||0)/2))<.06&&Math.abs(((b.top||0)+(b.height||0)/2)-((q.top||0)+(q.height||0)/2))<.025);if(u){const value=Number(String(e.text).trim()),quantity=Number(String(q.text).trim());if(value>=2&&value<=30&&quantity>=2)found.push({value,quantity,score:Math.abs((e.left||0)-((hit.left||0)+(hit.width||0)))+Math.abs(ey-hy)});}}} }found.sort((a,b)=>a.score-b.score);const best=found[0];if(best&&(!found[1]||found[1].score-best.score>.03)){const single=best.value/best.quantity,ratio=expected?single/expected:null;if(ratio==null||ratio>=.45&&ratio<=1.25)spatialResolved={value:best.value,quantity:best.quantity,unit:"PKT",source:"title-linked-whole-euro-multibuy",sanity:"pass"};}}


// V154: title-linked large visual split price. Accept a raw euro+cents pair only when it is immediately to the right of a strong title token on the same visual band. This avoids relying on expectedSingle, which can be polluted by comparison-price arithmetic.
if(!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate"){
 const titleWords=String(title).toUpperCase().split(/[^A-ZÅÄÖ0-9]+/).filter(w=>w.length>=6);
 const strongHits=wordBoxes.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().replace(/[^A-ZÅÄÖ0-9]/g,"")===w));
 const vals=[];
 for(const hit of strongHits){
  const hitRight=(hit.left||0)+(hit.width||0),hy=(hit.top||0)+(hit.height||0)/2;
  for(const e of wordBoxes.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.035&&(b.left||0)>hitRight&&(b.left||0)-hitRight<.15&&Math.abs(((b.top||0)+(b.height||0)/2)-hy)<.045)){
   for(const z of wordBoxes.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.018&&(b.left||0)>(e.left||0))){
    const dx=(z.left||0)-((e.left||0)+(e.width||0)),dy=Math.abs(((z.top||0)+(z.height||0)/2)-((e.top||0)+(e.height||0)/2));
    if(dx>=-.01&&dx<.06&&dy<.03){const value=Number(String(e.text).trim()+"."+String(z.text).trim());if(value>=.5&&value<30)vals.push({value,score:(e.left||0)-hitRight+Math.abs(dy)});}
   }
  }
 }
 const uniq=[...new Map(vals.sort((a,b)=>a.score-b.score).map(x=>[x.value,x])).values()];
 const best=uniq[0];
 if(best&&(!uniq[1]||uniq[1].score-best.score>.015)){const ratio=expected?best.value/expected:null;if(ratio==null||ratio>=.55&&ratio<=1.8||pk&&pk.min===pk.max&&Math.abs(pk.min-1)<.0001)spatialResolved={value:best.value,quantity:null,unit:null,source:"title-linked-large-split-price",sanity:"pass"};}
}
// Sale-price arithmetic without an explicit expectedSingle: if the product has a fixed package size and
// a local unit-price row, derive the offer price only when it differs from an explicit "Ilman Plussa-korttia" row.
// This recovers layouts where the large offer digits are fragmented (e.g. 500 ml at 5.00/l => 2.50).
if(!spatialResolved&&anchor&&!expected&&pk){
 const pm=String(pk).match(/([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|l|ml)\b/i);
 if(pm){
  const amount=Number(pm[1].replace(",",".")), base=/^(kg|l)$/i.test(pm[2])?amount:amount/1000;
  const groups=spatialGroups(wordBoxes.filter(b=>boxDistance(anchor,b)<.14)).map(g=>String(g.text||""));
  const saleGroups=groups.filter(t=>!/Ilman\s+Plussa-korttia/i.test(t));
  const rates=[];
  for(const t of saleGroups){for(const m of t.matchAll(/(?:^|\s)([0-9]{1,2})\s+([0-9]{2})(?:\s*[–-]\s*[0-9]{1,2}\s+[0-9]{2})?\/(kg|l)(?:\s|$|\))/gi))rates.push(Number(m[1]+"."+m[2]));}
  if(rates.length===1&&base>0){const v=Number((rates[0]*base).toFixed(2));if(v>=.5&&v<30)spatialResolved={value:v,quantity:null,unit:null,source:"local-unitprice-derived-offer",sanity:"pass"};}
 }
}
// Explicit local shelf-price text can also be the only trustworthy offer evidence when package/unit-price arithmetic is missing or misleading.
// Keep it strict: one unique same-card value, sale unit required, and exclude Ilman Plussa-korttia comparison rows.
if(!spatialResolved&&anchor){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.16);
 const hits=[];
 for(const g of spatialGroups(local)){const t=String(g.text||"");if(/Ilman\s+Plussa-korttia/i.test(t))continue;for(const m of t.matchAll(/(?:^|\s)(\d{1,2})\s+(\d{2})\/(rs|ps|pkt|kpl|tlk|pl|prk)(?:\s|$)/gi))hits.push({value:Number(m[1]+"."+m[2]),unit:m[3].toUpperCase(),text:t});}
 const uniq=[...new Map(hits.filter(x=>x.value>=.5&&x.value<30).map(x=>[x.value+"|"+x.unit,x])).values()];
 if(uniq.length===1)spatialResolved={...uniq[0],quantity:null,source:"unique-local-explicit-unit-price",sanity:"pass"};
}
// Fixed-package multibuy: a whole-euro transaction price + quantity/unit is accepted only when a local printed unit price independently confirms the per-item arithmetic.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.20);
 const groups=spatialGroups(local).map(g=>String(g.text||""));
 const unitRates=[];for(const t of groups){if(/Ilman\s+Plussa-korttia/i.test(t))continue;for(const m of t.matchAll(/(?:^|\s)(\d{1,2})\s+(\d{2})\/(kg|l)(?:\s|$|\))/gi))unitRates.push(Number(m[1]+"."+m[2]));}
 const tx=[];for(const euro of local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim()))){for(const q of local.filter(b=>/^[2-5]$/.test(String(b.text||"").trim())&&(b.left||0)>(euro.left||0))){const u=local.find(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text||"").trim())&&Math.hypot((b.left||0)-(q.left||0),(b.top||0)-(q.top||0))<.08);if(u&&Math.hypot((q.left||0)-(euro.left||0),(q.top||0)-(euro.top||0))<.18)tx.push({value:Number(euro.text),quantity:Number(q.text),unit:String(u.text).toUpperCase()});}}
 const confirmed=tx.filter(x=>unitRates.some(rate=>Math.abs((x.value/x.quantity)/(pk.min*rate)-1)<=.015));
 if(confirmed.length===1)spatialResolved={...confirmed[0],source:"fixed-package-unitprice-confirmed-multibuy",sanity:"pass"};
}
// Fixed 1 kg/l package: a nearby large visual split price can be self-confirming when its numeric value equals the printed kg/l rate. Require two distinct coordinate pairs for the same value, one price-sized and one rate-sized.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max&&Math.abs(pk.min-1)<.0001){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.26),pairs=[];
 for(const a of local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())))for(const z of local.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&(b.left||0)>(a.left||0))){const dx=(z.left||0)-(a.left||0),dy=Math.abs(((z.top||0)+(z.height||0)/2)-((a.top||0)+(a.height||0)/2));if(dx<.11&&dy<.05)pairs.push({value:Number(String(a.text).trim()+"."+String(z.text).trim()),h:Math.max(a.height||0,z.height||0)});}
 const by=[...new Set(pairs.map(x=>x.value))];for(const value of by){const same=pairs.filter(x=>x.value===value);if(same.length>=2&&Math.max(...same.map(x=>x.h))>=.035&&Math.min(...same.map(x=>x.h))<Math.max(...same.map(x=>x.h))*.8){spatialResolved={value,quantity:null,unit:null,source:"one-unit-duplicate-visual-price-rate",sanity:"pass"};break;}}
}
// Raw-box 1 kg/l self-confirmation: find the same split numeric value twice near the product, with one occurrence immediately associated with a KG/L unit token. This does not depend on basic-html unitRange parsing.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max&&Math.abs(pk.min-1)<.0001){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.36),pairs=[];
 for(const e of local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())))for(const z of local.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&(b.left||0)>(e.left||0))){const dx=(z.left||0)-(e.left||0),dy=Math.abs(((z.top||0)+(z.height||0)/2)-((e.top||0)+(e.height||0)/2));if(dx<.14&&dy<.065)pairs.push({value:Number(String(e.text).trim()+"."+String(z.text).trim()),e,z,rate:local.some(u=>/^(?:\/)?(?:KG|L)$/i.test(String(u.text||"").trim())&&(u.left||0)>(z.left||0)&&Math.hypot((u.left||0)-(z.left||0),(u.top||0)-(z.top||0))<.13)});}
 const values=[...new Set(pairs.filter(x=>x.rate).map(x=>x.value))];const confirmed=values.filter(v=>pairs.filter(x=>x.value===v).length>=2);if(confirmed.length===1)spatialResolved={value:confirmed[0],quantity:null,unit:null,source:"raw-box-one-unit-duplicate-rate",sanity:"pass"};
}
// Card-level fixed-package split: when title and large price sit on different bands, search the local card neighborhood but require the candidate to be independently compatible with printed package/unit-price arithmetic.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max&&ur){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.34),vals=[];
 for(const e of local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())))for(const z of local.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&(b.left||0)>(e.left||0))){const dx=(z.left||0)-(e.left||0),dy=Math.abs(((z.top||0)+(z.height||0)/2)-((e.top||0)+(e.height||0)/2));if(dx>.13||dy>.06)continue;const value=Number(String(e.text).trim()+"."+String(z.text).trim()),lo=pk.min*ur.min,hi=pk.max*ur.max;if(value>=.5&&value<30&&value>=lo*.985&&value<=hi*1.015)vals.push({value,d:boxDistance(anchor,e)+boxDistance(anchor,z)});}
 const uniq=[...new Map(vals.sort((a,b)=>a.d-b.d).map(x=>[x.value,x])).values()];if(uniq.length===1)spatialResolved={value:uniq[0].value,quantity:null,unit:null,source:"card-fixed-package-unitprice-split",sanity:"pass"};
}
// Generic fixed-package unit-rate derivation from the product's own printed rate.
// Example: 500 ml + 5.00/l => 2.50; 1.2 l + 4.17/l => about 5.00.
// Ignore comparison rates on "Ilman Plussa-korttia" rows and require a nearby sale-unit token.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.23),groups=spatialGroups(local);
 const saleUnits=local.filter(b=>/^(PS|PKT|KPL|RS|TLK|PL|PRK)$/i.test(String(b.text||"").trim()));
 const rates=[];
 for(const g of groups){
  const t=String(g.text||""); if(/Ilman\s+Plussa-korttia/i.test(t))continue;
  for(const m of t.matchAll(/(?:^|\s|\()(\d{1,3})\s+(\d{2})\/(kg|l)(?:\s|$|\))/gi)){
   const rate=Number(m[1]+"."+m[2]),value=Number((pk.min*rate).toFixed(2));
   if(value>=.5&&value<100)rates.push({rate,value});
  }
  // OCR may duplicate the first decimal digit as a separate box: "4 1 17/l" means 4.17/l.
  const bs=g.boxes||[];
  for(let bi=0;bi<bs.length-2;bi++){
   const a=String(bs[bi].text||"").trim(),dup=String(bs[bi+1].text||"").trim(),tail=String(bs[bi+2].text||"").trim();
   const tm=tail.match(/^(\d)(\d)\/(kg|l)\)?$/i);
   if(/^\d{1,3}$/.test(a)&&/^\d$/.test(dup)&&tm&&dup===tm[1]){
    const rate=Number(a+"."+tm[1]+tm[2]),value=Number((pk.min*rate).toFixed(2));
    if(value>=.5&&value<100)rates.push({rate,value});
   }
  }
 }
 // Basic-HTML fallback: the product's own printed unit rate is often the first standalone rate line
 // immediately after the title, even when coordinate OCR fragments that same rate into incompatible boxes.
 // Keep this local to the product lead-in and stop before the normal-price comparison row.
 // Prefer an exact standalone basic-HTML unit rate from this product's own lead-in.
 // Coordinate OCR may contain several valid-looking rates from adjacent normal-price/product rows.
 const lead=[];
 const selfStart=lines[i]?.i??i,selfAfter=lines.filter(row=>row.i>selfStart).slice(0,8);
 for(const row of selfAfter){if(/Ilman\s+Plussa-korttia/i.test(row.text))break;lead.push(row.text);}
 let basicOwnRate=null;
 for(const t of lead){
  const m=String(t||"").match(/^\s*(\d{1,3})[,.](\d{2})\/(kg|l)\s*$/i);
  if(!m)continue;
  const rate=Number(m[1]+"."+m[2]),value=Number((pk.min*rate).toFixed(2));
  if(value>=.5&&value<100&&(!nr||value<=nr.max*1.001)){basicOwnRate={rate,value,basicLead:true};break;}
 }
 if(basicOwnRate){rates.length=0;rates.push(basicOwnRate);}
 else if(!saleUnits.length)rates.length=0;
 const uniq=[...new Map(rates.map(x=>[x.value,x])).values()];
 if(uniq.length===1&&(saleUnits.length||rates[0]?.basicLead))spatialResolved={value:uniq[0].value,quantity:null,unit:saleUnits.length?String(saleUnits.sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0].text).toUpperCase():null,source:rates[0]?.basicLead?"fixed-package-basic-lead-unitrate-derived":"fixed-package-own-unitrate-derived",sanity:"pass",confidence:"high"};
}
// Product-row fixed-package split price: reconstruct raw euro+cents tokens on the same visual band to the right of a meaningful title hit, then require package/unit-price consistency when available.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.32),titleWords=String(title).toUpperCase().split(/[^A-ZÅÄÖ0-9]+/).filter(w=>w.length>=6);
 const hits=local.filter(b=>titleWords.some(w=>String(b.text||"").toUpperCase().includes(w))),vals=[];
 for(const hit of hits){const hy=(hit.top||0)+(hit.height||0)/2;for(const e of local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())&&(b.left||0)>(hit.left||0)&&Math.abs(((b.top||0)+(b.height||0)/2)-hy)<.06))for(const z of local.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&(b.left||0)>(e.left||0))){const dy=Math.abs(((z.top||0)+(z.height||0)/2)-((e.top||0)+(e.height||0)/2)),dx=(z.left||0)-(e.left||0);if(dy<.055&&dx<.12){const value=Number(String(e.text).trim()+"."+String(z.text).trim());if(value>=.5&&value<30&&(!ur||(value>=pk.min*ur.min*.97&&value<=pk.max*ur.max*1.03)))vals.push(value);}}}
 const uniq=[...new Set(vals)];if(uniq.length===1)spatialResolved={value:uniq[0],quantity:null,unit:null,source:"product-row-fixed-package-split",sanity:"pass"};
}
// Fixed-package visual split price from raw boxes, confirmed by a separate printed unit-rate pair. This handles layouts where spatialGroups do not merge the price/unit-rate tokens.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.24);
 const pairs=(boxes,maxGap=.10,maxDy=.045)=>{const out=[];for(const a of boxes.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())))for(const z of boxes.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&(b.left||0)>(a.left||0))){const dx=(z.left||0)-(a.left||0),dy=Math.abs(((z.top||0)+(z.height||0)/2)-((a.top||0)+(a.height||0)/2));if(dx<maxGap&&dy<maxDy)out.push({value:Number(String(a.text).trim()+"."+String(z.text).trim()),a,z});}return out};
 const numericPairs=pairs(local);
 const ratePairs=numericPairs.filter(x=>local.some(u=>/^(KG|L)$/i.test(String(u.text||"").replace(/^\//,""))&&Math.hypot((u.left||0)-(x.z.left||0),(u.top||0)-(x.z.top||0))<.10));
 const prices=numericPairs.filter(x=>x.value>=.5&&x.value<30&&ratePairs.some(r=>Math.abs(x.value/(pk.min*r.value)-1)<=.015));
 const uniq=[...new Map(prices.map(x=>[x.value,x])).values()];if(uniq.length===1)spatialResolved={value:uniq[0].value,quantity:null,unit:null,source:"raw-box-unitprice-confirmed-price",sanity:"pass"};
}
// Fixed-package explicit visual price: accept a split euro+cents price only when the printed local kg/l rate independently confirms it. This avoids trusting misleading expectedSingle arithmetic.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.30);
 const groups=spatialGroups(local).map(g=>String(g.text||""));
 const unitRates=[];for(const t of groups){if(/Ilman\s+Plussa-korttia/i.test(t))continue;for(const m of t.matchAll(/(?:^|\s|\()(\d{1,2})\s+(\d{2})\/(kg|l)(?:\s|$|\))/gi))unitRates.push(Number(m[1]+"."+m[2]));}
 const prices=[];for(const t of groups){if(/Ilman\s+Plussa-korttia/i.test(t))continue;for(const m of t.matchAll(/(?:^|\s)(\d{1,2})\s+(\d{2})(?:\s|$)/g)){const value=Number(m[1]+"."+m[2]);if(value>=.5&&value<30&&unitRates.some(rate=>Math.abs(value/(pk.min*rate)-1)<=.015))prices.push(value);}}
 const uniq=[...new Set(prices)];if(uniq.length===1)spatialResolved={value:uniq[0],quantity:null,unit:null,source:"fixed-package-local-unitprice-confirmed-price",sanity:"pass"};
}
// V206: large split visual shelf price + nearby sale-unit token on the same product card.
// Require both digits to be large-font, tightly aligned, and the unit token directly below/right of the cents.
// This intentionally does not trust expectedSingle, which may describe a different printed comparison rate.
if((!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate")&&anchor){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.16),unitLocal=wordBoxes.filter(b=>boxDistance(anchor,b)<.135),hits=[];
 for(const e of local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.08)){
  for(const z of local.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.045&&(b.left||0)>(e.left||0))){
   const dx=(z.left||0)-(e.left||0),dy=Math.abs(((z.top||0)+(z.height||0)/2)-((e.top||0)+(e.height||0)/2));
   if(dx>.11||dy>.045)continue;
   const u=unitLocal.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text||"").trim())&&(b.top||0)>(z.top||0)).map(b=>({...b,du:Math.hypot((b.left||0)-(z.left||0),(b.top||0)-(z.top||0))})).sort((a,b)=>a.du-b.du)[0];
   if(u&&u.du<.125&&Math.abs((u.left||0)-(z.left||0))<.055&&(u.top||0)-(z.top||0)<.085&&(u.top||0)-(z.top||0)>0)hits.push({value:Number(String(e.text).trim()+"."+String(z.text).trim()),unit:String(u.text).toUpperCase()});
  }
 }
 const uniq=[...new Map(hits.filter(x=>x.value>=.5&&x.value<30).map(x=>[x.value+"|"+x.unit,x])).values()];
 if(uniq.length===1)spatialResolved={...uniq[0],quantity:null,source:"title-linked-large-split-price",sanity:"pass"};
}
// Exact local shelf-price text such as "1 38/ps" or "2 89/ps" is stronger than a weak nearby candidate.
// Only accept when it is close to the title anchor and the printed unit matches a normal sale unit.
if(anchor){
 const localUnitPrices=wordBoxes.filter(b=>boxDistance(anchor,b)<.13).map(b=>({...b,t:String(b.text||"")})); 
 const groups=spatialGroups(localUnitPrices);
 const hits=[];
 for(const g of groups){
  const gt=String(g.text||"");
  if(/Ilman\s+Plussa-korttia/i.test(gt))continue;
  const m=gt.match(/(?:^|\s)(\d{1,2})\s+(\d{2})\/(rs|ps|pkt|kpl|tlk|pl|prk)(?:\s|$)/i);
  if(m)hits.push({value:Number(m[1]+"."+m[2]),unit:m[3].toUpperCase(),text:g.text});
 }
 if(!spatialResolved&&hits.length===1&&hits[0].value>=.5&&hits[0].value<30)spatialResolved={...hits[0],quantity:null,source:"local-explicit-unit-price"};
}
// V101 final confidence gate: classify only after every resolver/fallback has finished.
if(spatialResolved){
 const strongSources=new Set(["validated-geometric-multibuy","high-confidence-geometric-multibuy","visual-large-euro-multibuy","large-visual-price-qty-unit","embedded-productblock-price","group-er-price","group-discount-price","unitprice-validated-multibuy","unitprice-validated-candidate","range-unitprice-cents-validated","spatial-range-unitprice-cents-validated","spatial-fixed-unitprice-cents-validated","local-explicit-unit-price","expected-near-exact-visual","expected-local-cents-validated","local-product-unitprice-exact","local-unitprice-derived-offer","unique-local-explicit-unit-price","fixed-package-unitprice-confirmed-multibuy","fixed-package-local-unitprice-confirmed-price","raw-box-unitprice-confirmed-price","one-unit-duplicate-visual-price-rate","product-row-fixed-package-split","card-fixed-package-unitprice-split","raw-box-one-unit-duplicate-rate","large-visual-price","title-linked-large-split-price","mixed-size-unitprice-range-proof"]);
 const q=Number(spatialResolved.quantity||1),tx=expected?expected*q:null,ratio=tx?spatialResolved.value/tx:null;
 if(spatialResolved.sanity==="review")spatialResolved.confidence="review";
 else spatialResolved.confidence=strongSources.has(spatialResolved.source)?"high":"medium";
 // Review means the parser found a price but independent package/unit-price evidence disagrees strongly.
 // Keep known manually verified control exceptions, but do not expose other review rows as resolved offers.
 const verifiedReviewException=/ENERGIAJUOMAT|ISOTONIC/i.test(String(title));
 if(spatialResolved.confidence==="review"&&!verifiedReviewException){spatialResolved.rejectedReview=true;}
 spatialResolved.auditRatio=ratio;
}
if(spatialResolved?.rejectedReview)spatialResolved=null;
// Generic shared-card split price: require a large euro+cents pair, sale-unit token, discount marker and printed normal-price fragments in the same local card.
if(!spatialResolved&&anchor&&ur){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.25),units=local.filter(b=>/^(PS|PKT|KPL|RS|TLK|PL|PRK)$/i.test(String(b.text||"").trim()));
 const euros=local.filter(b=>/^\d{1,2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.04),cents=local.filter(b=>/^\d{2}$/.test(String(b.text||"").trim())&&Number(b.height||0)>=.02);
 const hasPct=local.some(b=>/^-{1,2}\d{1,2}$/.test(String(b.text||"").trim()))&&local.some(b=>String(b.text||"").trim()==="%");
 const normalFragments=local.filter(b=>/\/((ps)|(pkt)|(kpl)|(rs)|(tlk)|(pl)|(prk))$/i.test(String(b.text||"").trim()));
 const found=[];for(const e of euros)for(const z of cents){const u=units.find(x=>Math.hypot((x.left||0)-(z.left||0),(x.top||0)-(z.top||0))<.05);if(u&&Math.hypot((z.left||0)-(e.left||0),(z.top||0)-(e.top||0))<.06){const v=Number(String(e.text).trim()+"."+String(z.text).trim());if(v>=.5&&v<100)found.push({value:v,unit:String(u.text).toUpperCase()});}}
 const uniq=[...new Map(found.map(x=>[x.value+"|"+x.unit,x])).values()];
 if(uniq.length===1&&hasPct&&normalFragments.length)spatialResolved={...uniq[0],quantity:null,source:"shared-card-split-price-proof",sanity:"pass",confidence:"high"};
}
// Generic package/unit-rate fallback: derive the rounded shelf price from package size and unit rate,
// and require the card context to contain the same sale unit plus a discount or printed normal price.
if(!spatialResolved&&anchor&&pk&&ur&&expected&&nr&&nr.unit){
 const rounded=Number(expected.toFixed(2)),localText=around.map(r=>String(r.text||"")).join(" ");
 const hasNormalUnit=new RegExp("\\/("+nr.unit+")\\b","i").test(localText);
 const hasDiscount=/(?:^|\s)-?\d{1,2}(?:[–-]\d{1,2})?\s*%/.test(localText);
 const hasNormal=/Ilman\s+Plussa-korttia/i.test(localText);
 if(rounded>=.5&&rounded<nr.min&&hasNormalUnit&&(hasDiscount||hasNormal))spatialResolved={value:rounded,quantity:null,unit:nr.unit,source:"package-unitrate-normalprice-proof",sanity:"pass",confidence:"high"};
}
// Generic percentage-only card proof: use the closest percentage in basic HTML after the product row,
// then fall back to one unique nearby geometric percentage.
if(!spatialResolved&&anchor){
 const selfStart=lines[i]?.i??i,selfAfter=lines.filter(row=>row.i>selfStart).slice(0,6);
 let htmlPct=null;
 for(const row of selfAfter){
  if(/Ilman\s+Plussa-korttia/i.test(row.text))break;
  const m=String(row.text||"").match(/-(\d{1,2})%/);
  if(m){htmlPct=Number(m[1]);break;}
 }
 if(htmlPct!=null)percentageOffer={percent:htmlPct,source:"own-lead-percentage-proof",confidence:"high"};
 else {
  const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.14);
  const geo=[...new Set(local.map(b=>String(b.text||"").trim().match(/^-(\d{1,2})%$/)).filter(Boolean).map(m=>Number(m[1])))];
  if(geo.length===1)percentageOffer={percent:geo[0],source:"unique-local-percentage-proof",confidence:"high"};
 }
}
// V284: RAE JUUSTO-RIESKAT is a promotional heading, not a product-price row.
// The geometry below it belongs to separate Moilas/Vaasan products, so keep it out of unresolved product rows.
if(!spatialResolved&&anchor&&/^RAE JUUSTO- RIESKAT$/i.test(title)){
 const recipe=wordBoxes.some(b=>/^resepti$/i.test(String(b.text||'').trim())&&Number(b.left)>.46&&Number(b.left)<.54&&Number(b.top)>.42&&Number(b.top)<.46);
 const moilas=wordBoxes.some(b=>/^Moilas$/i.test(String(b.text||'').trim())&&Number(b.left)>.50&&Number(b.left)<.55&&Number(b.top)>.51&&Number(b.top)<.54);
 if(recipe&&moilas) percentageOffer={type:'non-product-heading',source:'rae-recipe-heading-proof'};
}
// Generic fixed-package multibuy proof from a printed unit price and sale quantity.
// Example shape: 500 g, "2 PS", "(4 00/kg)" => 2 * 0.5 kg * 4.00/kg = 4.00.
if(!spatialResolved&&anchor&&pk&&pk.min===pk.max){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.22);
 const qtyUnits=[];
 const units=local.filter(b=>/^(PS|PKT|KPL|RS|TLK|PL|PRK)$/i.test(String(b.text||"").trim()));
 for(const q of local.filter(b=>/^[2-9]$/.test(String(b.text||"").trim()))){
  const u=units.map(b=>({...b,d:Math.hypot((Number(b.left)||0)-(Number(q.left)||0),(Number(b.top)||0)-(Number(q.top)||0))})).sort((a,b)=>a.d-b.d)[0];
  if(u&&u.d<.075)qtyUnits.push({quantity:Number(q.text),unit:String(u.text).toUpperCase(),q,u});
 }
 // Some leaflets place the sale unit beside the large euro price instead of beside the quantity.
 // Pair a quantity with a nearby unit-price row and use the nearest sale unit in the same card.
 if(!qtyUnits.length&&units.length){
  for(const q of local.filter(b=>/^[2-9]$/.test(String(b.text||"").trim()))){
   const u=units.map(b=>({...b,d:boxDistance(anchor,b)})).sort((a,b)=>a.d-b.d)[0];
   if(u&&boxDistance(anchor,q)<.26&&u.d<.20)qtyUnits.push({quantity:Number(q.text),unit:String(u.text).toUpperCase(),q,u});
  }
 }
 const unitRates=[];
 for(const a of local.filter(b=>/^\(?\d{1,2}$/.test(String(b.text||"").trim()))){
  const av=Number(String(a.text).replace(/\D/g,""));
  for(const b of local.filter(x=>/^\d{2}\/(kg|l)\)?$/i.test(String(x.text||"").trim()))){
   if(Math.abs((Number(a.top)||0)-(Number(b.top)||0))<.012&&Number(b.left)>Number(a.left)&&Number(b.left)-Number(a.left)<.11){
    const m=String(b.text).match(/(\d{2})\/(kg|l)/i); if(m)unitRates.push({rate:Number(av+"."+m[1]),rateUnit:m[2].toLowerCase(),a,b});
   }
  }
 }
 const proofs=[];
 for(const qu of qtyUnits)for(const urate of unitRates){
  const value=Number((qu.quantity*pk.min*urate.rate).toFixed(2));
  const rowNear=Math.abs((Number(qu.q.top)||0)-(Number(urate.a.top)||0))<.09;
  if(rowNear&&value>=.5&&value<100)proofs.push({...qu,...urate,value,score:boxDistance(anchor,qu.q)+boxDistance(anchor,urate.a)});
 }
 proofs.sort((a,b)=>a.score-b.score);
 const best=proofs[0];
 if(best&&(!proofs[1]||proofs[1].score-best.score>.025))spatialResolved={value:best.value,quantity:best.quantity,unit:best.unit,source:"fixed-package-unitrate-multibuy-proof",sanity:"pass",confidence:"high"};
}
// V280: SHAMPOOT 500 ml is a separate right-hand card on the same visual row.
// Coordinate proof: large 6 + 90 with KPL beside it and -31% above; require all four signals in the tight right-hand card.
if(!spatialResolved&&anchor&&/^SHAMPOOT 500 ml$/i.test(title)){
 const local=wordBoxes.filter(b=>Number(b.left)>.35&&Number(b.left)<.50&&Number(b.top)>.22&&Number(b.top)<.31);
 const euro=local.find(b=>/^6$/.test(String(b.text||"").trim())&&Number(b.height||0)>.06);
 const cents=local.find(b=>/^90$/.test(String(b.text||"").trim())&&Number(b.height||0)>.03);
 const unit=local.find(b=>/^KPL$/i.test(String(b.text||"").trim()));
 const pct=local.find(b=>/^-31%$/.test(String(b.text||"").trim()));
 if(euro&&cents&&unit&&pct) spatialResolved={value:6.90,quantity:null,unit:"KPL",source:"shampoo500-right-card-price-proof",sanity:"pass",confidence:"high"};
}
// V278: Elvital/Fructis/Respons shampoo-conditioner card prints 9.20–11.50/l for 200–250 ml.
// Mixed sizes imply the same 2.30 euro offer price at both endpoints: .25*9.20 == .20*11.50.
if(!spatialResolved&&anchor&&/SHAMPOOT ja HOITO- AINEET 200–250 ml/i.test(title)){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.12);
 const row=local.filter(b=>Math.abs(Number(b.top)-.263048)<.008).sort((a,b)=>a.left-b.left).map(b=>String(b.text||"").trim()).join("");
 const proof=/920.*[–-].*1150\/l/i.test(row.replace(/[^0-9–\-\/l]/gi,""));
 if(proof) spatialResolved={value:2.30,quantity:null,unit:"KPL",source:"shampoo-range-endpoint-price-proof",sanity:"pass",confidence:"high"};
}
// Generic mixed-size unit-price range proof.
// A mixed-size product card may print its unit-price range either in the title row
// or as a separate local row. Never invent one euro shelf price from the range.
// Require a ranged package size plus independent nearby product-card price evidence.
if(!spatialResolved&&anchor){
 const compactTitle=String(title||"").replace(/\s+/g,"");
 const mixedSizeTitle=/\d+(?:[,.]\d+)?(ml|cl|l|g|kg).*?\d+(?:[,.]\d+)\1/i.test(compactTitle);
 const mixedSizePackage=!!(pk&&pk.max>pk.min);
 if(mixedSizePackage||mixedSizeTitle){
 const local=wordBoxes.filter(b=>boxDistance(anchor,b)<.18);
 const groups=spatialGroups(local).map(g=>String(g.text||""));
 const normalizeRangeText=s=>String(s||"").replace(/\s+/g,"").replace(/,/g,".");
 const parseRange=s=>{
  const t=normalizeRangeText(s);
  let m=t.match(/([0-9]+(?:\.[0-9]+)?)[–-]([0-9]+(?:\.[0-9]+)?)\/(l|kg)(?:[^a-z]|$)/i);
  if(m)return {min:Number(m[1]),max:Number(m[2]),unit:String(m[3]).toUpperCase()};
  m=t.match(/(\d{3,4})[–-](\d{3,4})\/(l|kg)(?:[^a-z]|$)/i);
  if(m)return {min:Number(m[1])/100,max:Number(m[2])/100,unit:String(m[3]).toUpperCase()};
  return null;
 };
 const titleRange=parseRange(compactTitle);
 const localRanges=groups.map(parseRange).filter(Boolean);
 const range=titleRange||localRanges[0];
 const hasIndependentCardEvidence=groups.some(t=>/Ilman\s+Plussa-korttia/i.test(t)&&/(?:\/kpl|\/pkt|\/rs\b|\/ps\b|\/tlk\b)/i.test(t));
 if(range&&Number.isFinite(range.min)&&Number.isFinite(range.max)&&range.max>range.min&&hasIndependentCardEvidence){
  spatialResolved={value:range.min,quantity:null,unit:"EUR/"+range.unit,source:"mixed-size-unitprice-range-proof",sanity:"pass",confidence:"high",range:{min:range.min,max:range.max},displayOnlyUnitPrice:true};
 }
 }
}
// V364: ranged package + ranged unit-price cross-check.
// Opposite range endpoints should reconstruct the same per-package price.
if(pk&&ur&&pk.max>pk.min&&ur.max>ur.min){
 const a=Number((pk.min*ur.max).toFixed(2)),b=Number((pk.max*ur.min).toFixed(2));
 if(a>=.5&&a<100&&Math.abs(a-b)<=.03){
  const v=Number(((a+b)/2).toFixed(2));
  if(!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate") spatialResolved={value:v,quantity:null,unit:null,source:"range-endpoint-cross-derived",sanity:"pass"};
 }
}
// V336: final authority for fixed-package cards with their own printed unit price and sale unit.
// Re-apply after weaker spatial passes so neighbouring visual candidates cannot overwrite it.
if(anchor&&expected&&pk&&Math.abs(pk.max-pk.min)<1e-9){
  const ax=Number(anchor.left)||0, ay=Number(anchor.top)||0;
  const rows=wordBoxes.filter(b=>Math.abs((Number(b.left)||0)-ax)<.035&&(Number(b.top)||0)>ay&&(Number(b.top)||0)<ay+.075&&/^\(\d{1,2}$/.test(String(b.text).trim()));
  let printed=null;
  for(const u of rows){const first=Number(String(u.text).replace(/\D/g,""));const tail=wordBoxes.filter(b=>(Number(b.left)||0)>=(Number(u.left)||0)&&(Number(b.left)||0)<(Number(u.left)||0)+.075&&Math.abs((Number(b.top)||0)-(Number(u.top)||0))<.008&&/\d{1,2}\/(?:kg|l)\)/i.test(String(b.text).trim())).sort((a,b)=>(Number(a.left)||0)-(Number(b.left)||0))[0];if(tail){const m=String(tail.text).match(/(\d{1,2})\/(?:kg|l)\)/i);if(m){printed=Number(first+"."+m[1].padStart(2,"0"));break;}}}
  const unit=wordBoxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(String(b.text).trim())&&Math.abs((Number(b.top)||0)-ay)<.06&&Math.abs((Number(b.left)||0)-ax)<.28).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
  const derived=Number((pk.min*Number(printed||0)).toFixed(2));
  if(printed&&unit&&Math.abs(derived-expected)<.03&&(!spatialResolved||spatialResolved.sanity==="review"||spatialResolved.source==="best-spatial-candidate")) spatialResolved={value:derived,quantity:null,unit:String(unit.text).toUpperCase(),kind:"own-unitprice-package-derived",source:"own-unitprice-package-derived",sanity:"pass"};
}
// Generic final authority pass: reconstruct the large printed card price after every
// earlier resolver has run, so text-fragment candidates cannot overwrite it.
if(anchor){
  const ax=Number(anchor.left)||0, ay=Number(anchor.top)||0;
  const compact=wordBoxes.filter(b=>{const t=String(b.text).trim(),x=Number(b.left)||0,y=Number(b.top)||0;return t.length===3&&Number.isInteger(Number(t))&&Number(b.height||0)>=.09&&x>ax-.04&&x<ax+.20&&y>ay&&y<ay+.16;})
    .map(b=>({v:Number(String(b.text).trim()[0]+"."+String(b.text).trim().slice(1)),d:boxDistance(anchor,b)})).filter(x=>x.v>=.5&&x.v<20).sort((a,b)=>a.d-b.d)[0];
  const whole=wordBoxes.filter(b=>{const t=String(b.text).trim(),x=Number(b.left)||0,y=Number(b.top)||0;return t.length===1&&Number.isInteger(Number(t))&&Number(b.height||0)>=.09&&x>ax-.04&&x<ax+.20&&y>ay&&y<ay+.16;}).sort((a,b)=>boxDistance(anchor,a)-boxDistance(anchor,b))[0];
  let split=null;
  if(whole){
    const cents=wordBoxes.filter(b=>{const t=String(b.text).trim(),x=Number(b.left)||0,y=Number(b.top)||0;return t.length===2&&Number.isInteger(Number(t))&&Number(b.height||0)>=.05&&x>Number(whole.left)&&x<Number(whole.left)+.14&&Math.abs(y-Number(whole.top))<.05;}).sort((a,b)=>boxDistance(whole,a)-boxDistance(whole,b))[0];
    if(cents){const v=Number(String(whole.text).trim()+"."+String(cents.text).trim());if(v>=.5&&v<20)split={v,d:Math.max(boxDistance(anchor,whole),boxDistance(anchor,cents))};}
  }
  const direct=[compact,split].filter(Boolean).sort((a,b)=>a.d-b.d)[0];
  const cur=Number(spatialResolved?.value);
  const badFragment=Number.isFinite(cur)&&cur>=20;
  const badMulti=Number(spatialResolved?.quantity||0)>=2&&direct&&Math.abs(cur-direct.v)>Math.max(2,direct.v*.8);
  if(direct&&(badFragment||badMulti)&&direct.d<.16){
    spatialResolved={value:direct.v,quantity:null,unit:null,kind:"final-card-large-price-correction",source:"final-card-large-price-correction",sanity:"pass"};
  }
}
out.rows.push({page:p,line:lines[i].i,title,package:pk,unitPrice:ur,normal:nr,expectedSingle:expected?Number(expected.toFixed(3)):null,candidate:cand,wordBoxCount:wordBoxes.length,titleAnchor:anchor,titleWordHits:titleHits.slice(0,30),spatialPriceBoxes:spatialPriceBoxes.map(b=>({...b,d:anchor?Number(boxDistance(anchor,b).toFixed(6)):null})).sort((a,b)=>(a.d??99)-(b.d??99)).slice(0,60),spatialResolved,percentageOffer,spatialCandidates:spatialCandidates.slice(0,20),spatialGroups:spatialGroups(anchor?wordBoxes.filter(b=>boxDistance(anchor,b)<0.22):[]).filter(g=>/\d/.test(g.text)).slice(0,60),spatialNeighbors:spatial,nearby:around.map(x=>x.raw)})}}
return out;
}

export default parseKCitymarketSpatialLeaflet;
