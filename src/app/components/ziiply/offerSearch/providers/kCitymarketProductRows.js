/** Canonical product identities from contiguous lines of one printed card. */
export function canonicalCitymarketProductRows(rows) {
  const items=mergeSharedPrintedVariants(rows).map(row=>restoreDescriptiveHeadline(restoreCountedVariantHeadline(row,rows),rows)).sort((a,b)=>a.page-b.page||(a.debugCardAnchor?.top??0)-(b.debugCardAnchor?.top??0));
  const consumed=new Set();
  const quantity=r=>r?.quantity==null||r.quantity===1?1:r.quantity;
  const sameTransaction=(a,b)=>a&&b&&a.value===b.value&&quantity(a)===quantity(b)&&
    (!a.unit||!b.unit||a.unit===b.unit);
  const line=row=>{
    if(['shared-printed-bundle-variant-block','contiguous-counted-variant-headline','same-column-descriptive-headline'].includes(row.productRowProof?.source))return row.title;
    const own=String(row.debugCardAnchor?.text||'').trim();
    const title=String(row.title||'').trim().replace(/^\d+KPL-\d+[–-]\d+%\s*/,'');
    const anchor=row.debugCardAnchor;
    const lettersOnly=t=>t.replace(/[^A-Za-zÅÄÖåäö]/g,'');
    const cleaned=title.replace(/^\d+\s*KPL\s+/i,'').replace(/\s+\d{1,2}$/,'');
    if(anchor&&row.spatialResolved&&lettersOnly(cleaned)===lettersOnly(own)&&
       /\b\d+\s*(?:kg|g|ml|l)\b/i.test(own)&&
       Number((title.match(/\s+(\d{1,2})$/)||[])[1])===Math.round((row.spatialResolved.value%1)*100))return cleaned;
    if(anchor){
      // Restore a conjunction's preceding printed line only within the same
      // column and font size. Contained overlay glyphs are not separate words.
      const boxes=row.debugNearbyBoxes||[];
      const starts=boxes.filter(b=>Math.abs(b.left-anchor.left)<.005&&
        anchor.top-b.top>.005&&anchor.top-b.top<.025&&
        Math.abs(b.height-anchor.height)<.001&&/^[A-ZÅÄÖ][A-ZÅÄÖ-]{2,}$/.test(b.text));
      const nearest=starts.filter(b=>b.top===Math.max(...starts.map(x=>x.top)));
      if(nearest.length===1){
        const start=nearest[0];
        const candidates=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&
          Math.abs(b.height-anchor.height)<.001&&b.left>=anchor.left-.001&&b.left<anchor.left+.25);
        const words=candidates.filter(b=>!candidates.some(other=>other!==b&&other.width>b.width&&
          other.left<=b.left+.001&&other.left+other.width>=b.left+b.width-.001)).sort((a,b)=>a.left-b.left);
        const prior=words.map(b=>b.text).join(' ');
        const safe=words.every(b=>/^(?:[A-ZÅÄÖ][A-ZÅÄÖ-]*|ja|tai|\d+(?:[,.]\d+)?|[gklm]+,?|kpl\/pkt|tab\/ps)$/.test(b.text));
        if(safe&&(/^ja\s+[A-ZÅÄÖ]/.test(title)||(/\bja\s+[A-ZÅÄÖ]/.test(prior)&&! /\d/.test(prior))))return prior+' '+title;
      }
    }
    if(anchor&&/^tai\s+[A-ZÅÄÖ]/.test(title)){
      const previous=(row.debugNearbyBoxes||[]).filter(b=>Math.abs(b.left-anchor.left)<.005&&
        anchor.top-b.top>.005&&anchor.top-b.top<.025&&/^[A-ZÅÄÖ]{3,}[A-ZÅÄÖ-]*$/.test(b.text));
      if(previous.length===1&&! (row.debugNearbyBoxes||[]).some(b=>Math.abs(b.top-previous[0].top)<.001&&b.left>=anchor.left-.001&&b.left<anchor.left+.25&&/\d/.test(b.text))){
        const start=previous[0];
        const words=(row.debugNearbyBoxes||[]).filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=anchor.left-.001&&b.left<anchor.left+.25&&/^[A-ZÅÄÖ][A-ZÅÄÖ-]+$/.test(b.text)).sort((a,b)=>a.left-b.left).map(b=>b.text);
        return words.join(' ')+' '+title;
      }
    }
    if(anchor && row.package?.raw){
      const starts=(row.debugNearbyBoxes||[]).filter(b=>/^[A-ZÅÄÖ]{3,}[A-ZÅÄÖ-]*$/.test(b.text)&&
        Math.abs(b.left-anchor.left)<.005&&b.top-anchor.top>.005&&b.top-anchor.top<.025);
      if(starts.length===1){
        const start=starts[0];
        const words=(row.debugNearbyBoxes||[]).filter(b=>Math.abs(b.top-start.top)<.001&&
          b.left>=anchor.left-.001&&b.left<anchor.left+.25&&/^[A-ZÅÄÖ][A-ZÅÄÖ-]+$/.test(b.text)).sort((a,b)=>a.left-b.left).map(b=>b.text);
        const proposed=own+(own.endsWith('-')?'':' ')+words.join(' ')+' '+row.package.raw;
        const letters=t=>t.replace(/\([^)]*\)/g,'').replace(/[^A-Za-zÅÄÖåäö-]/g,'');
        const numbers=t=>(t.replace(/\([^)]*\)/g,'').match(/\d+(?:[,.]\d+)?/g)||[]).join('|');
        if(letters(proposed)===letters(title)&&numbers(proposed)!==numbers(title))return proposed;
      }
    }
    const withoutNumber=title.replace(/^\d+\.\s*/,'');
    if(own===withoutNumber)return own;
    if(/\b\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l)\b/i.test(own) && title.startsWith(own) && /^\s*\d+[\d\s,.()\/kgml–-]*$/.test(title.slice(own.length)))return own;
    return title;
  };
  return items.flatMap((row,index)=>{
    if(consumed.has(index))return [];
    let title=line(row);
    const anchor=row.debugCardAnchor;
    if(anchor){
      const candidates=items.map((next,i)=>({next,i})).filter(({next,i})=>i!==index&&!consumed.has(i)&&next.page===row.page&&
        next.debugCardAnchor&&Math.abs(next.debugCardAnchor.left-anchor.left)<.005&&
        next.debugCardAnchor.top-anchor.top>.005&&next.debugCardAnchor.top-anchor.top<.025&&
        sameTransaction(row.spatialResolved,next.spatialResolved)&&
        row.unitPrice?.min===next.unitPrice?.min&&row.unitPrice?.max===next.unitPrice?.max);
      if(candidates.length===1){
        const {next,i}=candidates[0];const continuation=line(next);
        if((/(?:[A-ZÅÄÖ]-|\bja)$/.test(title)&&/^[A-ZÅÄÖ]/.test(continuation))||/^tai\s+[A-ZÅÄÖ]/.test(continuation)){
          title=title.endsWith('-')?title+continuation:title+' '+continuation;
          consumed.add(i);
          if(row.package&&next.package&&row.package.raw!==next.package.raw){
            row.package={min:Math.min(row.package.min,next.package.min),max:Math.max(row.package.max,next.package.max),raw:[row.package.raw,next.package.raw].join(' / '),variantSizes:[row.package.raw,next.package.raw]};
          }else row.package=row.package||next.package;
          row.nearby=[...(row.nearby||[]),...(next.nearby||[])];
          row.productRowProof={source:'aligned-print-continuation-and-identical-transaction',titles:[row.title,next.title]};
        }
      }
    }
    return [{...row,title}];
  });
}

/** A mixed-set badge cannot become a discount for one component alone. */
export function rejectUnownedMixedSetPercentage(row){
  const context=(row.nearby||[]).join(' ');
  if(!row.spatialResolved&&row.percentageOffer&&/YHTEIS[\s-]*(?:ja\s+)?HINTAAN/i.test(context)&&/\bSETTI\b/i.test(context)){
    return {...row,percentageOffer:null,debugRejectedPercentage:{...row.percentageOffer,reason:'mixed-set-requires-owned-complete-product-identity'}};
  }
  return row;
}

/** Carry only metadata already established by the parser's owned price proof. */
export function citymarketTransactionMetadata(row){
  const resolved=row?.spatialResolved;
  if(!resolved)return {};
  const metadata={};
  if(String(resolved.unit||'').toUpperCase()==='KG')metadata.priceBasis='PER_KG';
  const count=resolved.packageCount??row?.package?.multiplier;
  if(Number.isInteger(count)&&count>1)metadata.packageCount=count;
  if(Number.isFinite(resolved.depositTotal)&&resolved.depositTotal>0){
    metadata.depositTotal=resolved.depositTotal;
    metadata.depositIncluded=true;
    metadata.depositSource=resolved.source;
  }
  return metadata;
}

/** Standalone category discounts must own an aligned printed badge below their title. */
export function resolveAlignedStandalonePercentage(row){
  if(row.package||row.spatialResolved||row.percentageOffer?.source!=='owned-publisher-percentage')return row;
  const a=row.debugCardAnchor;if(!a)return {...row,percentageOffer:null};
  const badges=(row.debugNearbyBoxes||[]).filter(b=>/^[-−–]\d{1,2}%$/.test(b.text)&&
    b.height>=.03&&Math.abs(b.left-a.left)<.08&&b.top>=a.top&&b.top-a.top<.11);
  const values=[...new Set(badges.map(b=>Number(b.text.replace(/[^\d]/g,''))).filter(n=>n>0&&n<100))];
  return {...row,percentageOffer:values.length===1?{percent:values[0],source:'aligned-printed-standalone-percentage',confidence:'high'}:null};
}

/** Recover wrapped category cards only with a large badge in their own column. Category filtering remains separate. */
export function recoverWrappedPercentageCards(rawBoxes, page, existingRows=[]){
  const unique=[...new Map(rawBoxes.map(b=>[JSON.stringify(b),b])).values()];
  const boxes=unique.filter(b=>b.height>=.012&&b.height<.025&&
    /^(?:-?[A-ZÅÄÖ][A-ZÅÄÖ,-]*|ja|sekä|tai|\d+(?:[–-]\d+)?|ml|g|kpl|cm)$/.test(b.text)&&
    !unique.some(c=>c!==b&&Math.abs(c.top-b.top)<.001&&Math.abs(c.height-b.height)<.001&&
      c.width>b.width+.001&&c.left<=b.left+.001&&c.left+c.width>=b.left+b.width-.001));
  const lines=[];
  for(const b of boxes.sort((a,b)=>a.top-b.top||a.left-b.left)){
    let line=lines.find(l=>Math.abs(l.top-b.top)<.001&&Math.abs(l.height-b.height)<.001&&
      b.left-l.right>=-.001&&b.left-l.right<.02);
    if(!line){line={left:b.left,top:b.top,height:b.height,right:b.left,words:[]};lines.push(line);}
    line.words.push(b);line.right=Math.max(line.right,b.left+b.width);
  }
  const consumed=new Set(),result=[];
  for(const start of lines){
    if(consumed.has(start))continue;
    const block=[start];let last=start;
    while(true){
      const next=lines.filter(l=>!block.includes(l)&&Math.abs(l.left-start.left)<.005&&
        Math.abs(l.height-start.height)<.001&&l.top-last.top>.005&&l.top-last.top<.022)
        .sort((a,b)=>a.top-b.top)[0];
      if(!next)break;block.push(next);last=next;
    }
    for(const l of block)consumed.add(l);
    const title=block.map(l=>l.words.map(b=>b.text).join(' ')).join(' ').replace(/- TUOTTEET/g,'TUOTTEET');
    if(!/IHONHOITO|HIUSTENHOITO|HIUSTENMUOTOILU|ITSERUSKETTAVAT|PUUTERIT|KULMATUOTTEET|MEIKIT|SUOJAPAPERIT|LAUTASLIINAT|(?:^|[ -])TUOTTEET$/.test(title))continue;
    if(existingRows.some(r=>r.title===title))continue;
    const badges=unique.filter(b=>/^[-−–]\d{1,2}%$/.test(b.text)&&b.height>=.05&&
      ((Math.abs(b.left-start.left)<.08&&b.top>=last.top+last.height&&b.top-last.top<.11)||
       (b.top>=start.top-.025&&b.top-last.top<.08&&
        ((b.left+b.width<=start.left+.005&&start.left-(b.left+b.width)<.04)||
         (b.left>=Math.max(...block.map(l=>l.right))&&b.left-Math.max(...block.map(l=>l.right))<.06)))));
    if(badges.length!==1)continue;
    if(unique.some(b=>/^\d+(?:[,.]\d+)?$/.test(b.text)&&b.height>=.03&&
      Math.abs(b.left-start.left)<.2&&b.top>=start.top&&b.top<badges[0].top+badges[0].height))continue;
    // Another headline between the title and badge makes ownership ambiguous.
    if(lines.some(l=>!block.includes(l)&&Math.abs(l.left-start.left)<.08&&
      l.top>last.top&&l.top<badges[0].top))continue;
    const percent=Number(badges[0].text.replace(/[^\d]/g,''));
    if(!(percent>0&&percent<100))continue;
    result.push({page,title,package:null,unitPrice:null,normal:null,spatialResolved:null,
      percentageOffer:{percent,source:'wrapped-column-printed-percentage',confidence:'high'},
      debugCardAnchor:{...start,text:title},debugNearbyBoxes:unique.filter(b=>
        Math.abs(b.left-start.left)<.28&&Math.abs(b.top-start.top)<.2),nearby:[title]});
  }
  return result;
}

/** Explicit title transactions supersede a percentage-only spatial interpretation. */
export function resolveExplicitTitleMultibuy(offer){
  const matches=[...String(offer.title||'').matchAll(/(\d{1,3}[,.]\d{2})\s*€?\s*\/\s*(\d{1,2})\s*(kpl|pkt|ps|prk|plo)\b/gi)];
  if(matches.length!==1)return offer;
  const match=matches[0],total=Number(match[1].replace(',','.')),quantity=Number(match[2]);
  if(!(total>0)||!Number.isInteger(quantity)||quantity<2||quantity>24)return offer;
  const percentageOnly=offer.campaignType==='campaign'&&offer.price==null&&Number(offer.discountPercent)>0;
  if(!percentageOnly&&offer.price===total&&offer.offerQuantity===quantity)return offer;
  const corrected={...offer,price:total,offerQuantity:quantity,offerUnit:match[3].toUpperCase(),resolutionSource:'explicit-leaflet-title-multibuy'};
  if(percentageOnly){
    corrected.title=String(offer.title).split(/\s+Plussa-kortilla\s+/i)[0].trim();
    corrected.campaignType='offer';
    delete corrected.discountPercent;delete corrected.benefitText;
  }
  return corrected;
}

/** Merge a comma-led variant block only with a common printed total, count and conjunction. */
export function mergeSharedPrintedVariants(rows){
 rows=[...rows].sort((a,b)=>a.page-b.page||(a.debugCardAnchor?.top??0)-(b.debugCardAnchor?.top??0));
 const consumed=new Set(),result=[];
 for(let i=0;i<rows.length;i++){
  if(consumed.has(i))continue;
  const row=rows[i],a=row.debugCardAnchor,r=row.spatialResolved;
  if(!a||!r||!Number.isInteger(r.value)||!(r.quantity>1)||!String(row.title).trim().endsWith(',')){result.push(row);continue;}
  const candidates=rows.map((next,j)=>({next,j})).filter(({next,j})=>j!==i&&next.page===row.page&&!next.spatialResolved&&next.package&&next.debugCardAnchor&&
    Math.abs(next.debugCardAnchor.left-a.left)<.005&&Math.abs(next.debugCardAnchor.height-a.height)<.001&&
    next.debugCardAnchor.top-a.top>.025&&next.debugCardAnchor.top-a.top<.07);
  if(candidates.length!==1){result.push(row);continue;}
  const {next,j}=candidates[0],last=next.debugCardAnchor;
  const unique=[...new Map((row.debugNearbyBoxes||[]).map(b=>[JSON.stringify(b),b])).values()];
  const right=Math.max(a.right??a.left,last.right??last.left);
  const prices=unique.filter(b=>b.text===String(r.value)&&b.height>=.03&&b.left>=right&&b.left-right<.15&&b.top>=a.top&&b.top-last.top<.035);
  const counts=unique.filter(b=>b.text===String(r.quantity)&&b.height>=.012&&b.height<.03&&b.left>=right&&b.left-right<.15&&b.top>=a.top&&b.top-last.top<.025);
  if(prices.length!==1||counts.length!==1||!unique.some(b=>/^(PKT|KPL|PS|RS)$/.test(b.text)&&Math.abs(b.top-counts[0].top)<.003&&Math.abs(b.left-counts[0].left)<.05)){result.push(row);continue;}
  const words=unique.filter(b=>b.left>=a.left-.001&&b.left<a.left+.25&&b.top>=a.top-.014&&b.top<=last.top+.001&&b.height>=.012&&b.height<.022)
   .filter(b=>!unique.some(c=>c!==b&&Math.abs(c.top-b.top)<.001&&Math.abs(c.height-b.height)<.001&&c.width>b.width+.001&&c.left<=b.left+.001&&c.left+c.width>=b.left+b.width-.001));
  if(!words.some(b=>/^(ja|tai)$/.test(b.text)&&b.top>a.top&&b.top<last.top)){result.push(row);continue;}
  const lines=[];for(const b of words.sort((a,b)=>a.top-b.top||a.left-b.left)){
   let l=lines.find(l=>Math.abs(l.top-b.top)<.001);if(!l){l={top:b.top,words:[]};lines.push(l);}l.words.push(b);
  }
  const title=lines.map(l=>l.words.sort((a,b)=>a.left-b.left).map(b=>b.text).join(' ')).join(' ');
  consumed.add(j);result.push({...row,title,package:null,unitPrice:null,
    spatialResolved:{...r,unit:unique.find(b=>/^(PKT|KPL|PS|RS)$/.test(b.text)&&Math.abs(b.top-counts[0].top)<.003&&Math.abs(b.left-counts[0].left)<.05).text},
    productRowProof:{source:'shared-printed-bundle-variant-block',titles:[row.title,next.title],packageVariants:[row.package?.raw,next.package.raw]}});
 }
 return result;
}

/** Restore preceding package variants from one contiguous printed headline column. */
export function restoreCountedVariantHeadline(row, rows=[]){
 const a=row.debugCardAnchor;
 if(!a||!row.spatialResolved||!Number.isInteger(row.spatialResolved.quantity)||row.spatialResolved.quantity<2||
    !/\b\d+\s*(?:kpl|tab)\/(?:pkt|ps)\b/.test(row.title)||! /\btai\b/.test(row.title))return {...row};
 const unique=[...new Map((row.debugNearbyBoxes||[]).map(b=>[JSON.stringify(b),b])).values()];
 const bs=unique.filter(b=>Math.abs(b.height-a.height)<.001&&b.left>=a.left-.001&&b.left<a.left+.25&&
   b.top<a.top-.005&&a.top-b.top<.08&&
   /^(?:[A-ZÅÄÖ][A-ZÅÄÖ-]*|\d+|tab\/ps|kpl\/pkt)$/.test(b.text)&&
   !unique.some(c=>c!==b&&Math.abs(c.top-b.top)<.001&&Math.abs(c.height-b.height)<.001&&
     c.width>b.width+.001&&c.left<=b.left+.001&&c.left+c.width>=b.left+b.width-.001));
 const lines=[];for(const b of bs.sort((x,y)=>x.top-y.top||x.left-y.left)){
  let l=lines.find(l=>Math.abs(l.top-b.top)<.001);
  if(!l){l={top:b.top,left:b.left,words:[]};lines.push(l);}l.words.push(b);
 }
 const prefix=[];let last=a.top;
 for(const l of lines.sort((x,y)=>y.top-x.top)){
  if(Math.abs(l.left-a.left)>.005||last-l.top>.022)break;
  prefix.unshift(l);last=l.top;
 }
 const text=prefix.map(l=>l.words.map(b=>b.text).join(' '));
 const variants=text.filter(t=>/\b\d+\s*(?:tab\/ps|kpl\/pkt)\b/.test(t));
 if(variants.length<2)return {...row};
 if(rows.some(r=>r!==row&&r.page===row.page&&r.debugCardAnchor&&r.spatialResolved&&
    Math.abs(r.debugCardAnchor.left-a.left)<.005&&r.debugCardAnchor.top>=last-.001&&r.debugCardAnchor.top<a.top-.005))return {...row};
 return {...row,title:[...text,row.title].join(' '),package:null,unitPrice:null,
  productRowProof:{source:'contiguous-counted-variant-headline',titles:[row.title],packageVariants:variants}};
}

/** Restore an adjacent descriptive headline and its own brand, never a neighbouring price. */
export function restoreDescriptiveHeadline(row,rows=[]){
 const a=row.debugCardAnchor;if(!a||!row.spatialResolved||row.productRowProof)return row;
 const unique=[...new Map((row.debugNearbyBoxes||[]).map(b=>[JSON.stringify(b),b])).values()];
 const starts=unique.filter(b=>Math.abs(b.left-a.left)<.005&&Math.abs(b.height-a.height)<.001&&a.top-b.top>.005&&a.top-b.top<.022&&/^[A-ZÅÄÖ]+$/.test(b.text));
 if(starts.length!==1)return row;const first=starts[0];
 const words=unique.filter(b=>Math.abs(b.top-first.top)<.001&&Math.abs(b.height-a.height)<.001&&b.left>=a.left-.001&&b.left<a.left+.25).sort((x,y)=>x.left-y.left);
 if(!words.every(b=>/^[A-ZÅÄÖ-]+$/.test(b.text)))return row;
 const prefix=words.map(b=>b.text).join(' ');if(!/\b(?:PANEROIDUT|MARINOIDUT|MAUSTETUT|SAVUSTETUT|PAISTETUT)$/.test(prefix)||row.title.includes(prefix))return row;
 if(rows.some(r=>r!==row&&r.page===row.page&&r.spatialResolved&&r.debugCardAnchor&&Math.abs(r.debugCardAnchor.left-a.left)<.005&&r.debugCardAnchor.top>=first.top-.001&&r.debugCardAnchor.top<a.top-.005))return row;
 const brands=unique.filter(b=>Math.abs(b.left-a.left)<.005&&first.top-b.top>.005&&first.top-b.top<.02&&b.height>=.01&&b.height<a.height&&/^[A-ZÅÄÖ][a-zåäö]+$/.test(b.text));
 const original=row.title.replace(/^\d+\.\s*/,'');
 return {...row,title:[...(brands.length===1?[brands[0].text]:[]),prefix,original].join(' '),productRowProof:{source:'same-column-descriptive-headline',titles:[original]}};
}
