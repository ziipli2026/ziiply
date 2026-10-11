/** Distinguish package contents from an independently priced multibuy. */
export function resolvePackageTransaction(title:string,description:string,price:number,quantity:number|null,fallbackRate:number|null,fallbackUnit:string){
  const own=description.split(/ilman\s+plussa-korttia/i)[0];
  const rates=[...own.matchAll(/\((\d+[,.]\d{2})\s*\/\s*(kg|l)\)/gi)];
  const rate=rates.length===1?Number(rates[0][1].replace(',','.')):fallbackRate;
  const unit=rates.length===1?rates[0][2].toLowerCase():fallbackUnit;
  const text=title+' '+own;
  const multiplied=text.match(/\b(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|ml|dl|l)\b/i);
  const pack=text.match(/\b(\d+)\s*-?\s*pack\b/i);
  const sizes=[...text.matchAll(/\b(\d+(?:[,.]\d+)?)\s*(kg|g|ml|dl|l)\b/gi)];
  const count=multiplied?Number(multiplied[1]):pack?Number(pack[1]):null;
  const size=multiplied?[multiplied[2],multiplied[3]]:sizes.length===1?[sizes[0][1],sizes[0][2]]:null;
  const deposits=[...own.matchAll(/sis\.?\s*pantit?\s*(\d+[,.]\d{2})/gi)];
  const deposit=deposits.length===1?Number(deposits[0][1].replace(',','.')):0;
  let packageContents=false;
  if(quantity!=null&&count===quantity&&size&&rate!=null&&rates.length===1){
    const sizeUnit=size[1].toLowerCase(),basis=/^(kg|g)$/.test(sizeUnit)?'kg':'l';
    const amount=Number(size[0].replace(',','.'))*({g:.001,kg:1,ml:.001,dl:.1,l:1}[sizeUnit]??0)*count;
    // Allow the printed two-decimal unit rate's rounding, never change the price.
    packageContents=basis===unit&&Math.abs(amount*rate+deposit-price)<=.02+amount*.005;
  }
  return {quantity:packageContents?null:quantity,unitPrice:rate,unit,packageCount:packageContents?count:null,deposit:deposits.length===1?deposit:null};
}
