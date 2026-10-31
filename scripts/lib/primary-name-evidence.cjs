const {createHash}=require('node:crypto');
function decode(text){return text.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function visible(html){return decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();}
function extractPrimaryName(html,ean){
 if(!/^\d{8,14}$/.test(ean))throw Error('Invalid expected EAN');
 const headings=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>visible(m[1])).filter(Boolean);
 const names=[...new Set(headings)];
 if(names.length!==1)throw Error('Expected one unambiguous product heading');
 const text=visible(html);
 // The EAN must be printed as product data, not merely occur in a URL,
 // recommendation, script payload or unrelated link.
 if(!new RegExp('\\bEAN(?:-koodi)?\\s*:?\\s*'+ean+'\\b','i').test(text))throw Error('Visible product EAN not confirmed');
 return {ean,name:names[0],sha256:createHash('sha256').update(html).digest('hex')};
}
function addsOnlyLooseModifier(current,observed){
 const words=s=>s.normalize('NFKC').toLocaleLowerCase('fi-FI').match(/[\p{L}\p{N}]+/gu)||[];
 const a=words(current),b=words(observed);
 // This recovery is limited to an omitted loose-sale attribute. It cannot
 // replace a producer, add an origin or rewrite another preparation/size.
 return a.length>0 && a.every(t=>b.includes(t)) && b.includes('irto')
   && b.filter(t=>!a.includes(t)).every(t=>t==='irto') && !a.some(t=>/pakattu|pakaste|jauhe|kuivattu/.test(t));
}
module.exports={extractPrimaryName,addsOnlyLooseModifier};
