import {findFuelLedRows,fuelLedPrice,fuelRowLabel,fuelOcrConsensus,fuelLedSegments} from './fuelPhotoLed';
import {parseFuelPhotoText,type FuelPrices} from './fuelPhoto';
type Worker={recognize:(image:string)=>Promise<{data:{text:string}}>;setParameters:(parameters:Record<string,string>)=>Promise<unknown>};
export async function readFuelPhoto(worker:Worker,data:string,onProgress?:(prices:FuelPrices)=>void,onDiagnostic?:(stage:string,details:Record<string,unknown>)=>void){
  const started=performance.now();const trace=(stage:string,details:Record<string,unknown>={})=>onDiagnostic?.(stage,{elapsedMs:Math.round(performance.now()-started),...details});
  trace('start',{imageBytes:data.length});
  // Detect the LED board before invoking Tesseract. Full-image OCR is slow
  // and mostly reads irrelevant scenery in fuel station photographs.
  const prices:FuelPrices={diesel:'',price95:'',price98:''};
  let originalText='';
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Kuvan avaaminen epäonnistui.'));img.src=data;});
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');if(!ctx)return {prices,text:originalText,review:false};
  ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  let rows=findFuelLedRows(pixels.data,canvas.width,canvas.height);
  // Some iPhone Safari JPEG decodes yield a weaker red LED mask. Retry on
  // a contrast-enhanced copy before falling back to expensive whole-image OCR.
  if(!rows.length){
    const enhanced=new Uint8ClampedArray(pixels.data);
    for(let i=0;i<enhanced.length;i+=4){
      const r=enhanced[i],g=enhanced[i+1],b=enhanced[i+2];
      if(r>g*1.12&&r>b*1.08&&r>55){
        enhanced[i]=Math.min(255,Math.round(r*1.45+20));
        enhanced[i+1]=Math.max(0,Math.round(g*.65));
        enhanced[i+2]=Math.max(0,Math.round(b*.7));
      }
    }
    rows=findFuelLedRows(enhanced,canvas.width,canvas.height);
    trace('led-rows-enhanced-retry',{count:rows.length});
  }
  trace('led-rows-detected',{count:rows.length,width:canvas.width,height:canvas.height});
  // Preserve a general-purpose fallback for images where red LED rows cannot be located.
  if(!rows.length){
    // Full-frame Tesseract consistently yields only scenery noise on iPhone photos
    // and delays the higher-resolution server recovery by several seconds.
    trace('fallback-full-image-ocr-skipped',{reason:'no-led-rows'});
    return {prices,text:originalText,review:true};
  }
  let review=false;
  const seen=new Set<keyof FuelPrices>();
  for(const [rowIndex,row] of rows.entries()){
    trace('led-row-start',{rowIndex,bounds:row});
    const crop=(left:number,right:number,red:boolean,invert=false,threshold=0,lowerLabel=false)=>{
      const c=document.createElement('canvas'),scale=invert?3:Math.min(4,Math.max(1,200/(row.bottom-row.top)));
      c.width=Math.round((right-left)*scale)+40;c.height=Math.round((row.bottom-row.top)*scale)+40;
      const x=c.getContext('2d')!;x.fillStyle='white';x.fillRect(0,0,c.width,c.height);const top=lowerLabel?row.top+(row.bottom-row.top)*.4:row.top;x.drawImage(image,left,top,right-left,row.bottom-top,20,20,c.width-40,c.height-40);
      if(red||invert){const d=x.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const r=d.data[i],g=d.data[i+1],b=d.data[i+2],v=invert?(threshold?(255-Math.round(r*.299+g*.587+b*.114)<threshold?0:255):255-Math.round(r*.299+g*.587+b*.114)):r>90&&r>g*1.25&&r>b*1.2?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;}x.putImageData(d,0,0);x.fillStyle='white';x.fillRect(0,0,c.width,20);x.fillRect(0,c.height-20,c.width,20);x.fillRect(0,0,20,c.height);x.fillRect(c.width-20,0,20,c.height);}
      return c.toDataURL('image/png');
    };
    // Read the label separately; never infer fuel from top-to-bottom order.
    if(row.left<15)continue;
    await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''});
    const labelVotes=new Map<NonNullable<ReturnType<typeof fuelRowLabel>>,number>();
    for(const threshold of [0,80]){
      const found=fuelRowLabel((await worker.recognize(crop(Math.max(0,row.left-(row.right-row.left)*.65),Math.max(1,row.left-8),false,true,threshold))).data.text);
      if(found)labelVotes.set(found,(labelVotes.get(found)||0)+1);
    }
    if(labelVotes.size!==1){
      for(const threshold of [0,120]){const found=fuelRowLabel((await worker.recognize(crop(Math.max(0,row.left-(row.right-row.left)*.65),Math.max(1,row.left-8),false,true,threshold,true))).data.text);if(found)labelVotes.set(found,(labelVotes.get(found)||0)+1);}
    }
    // A separate green MY Diesel label must never be mapped to ordinary diesel.
    // Inspect the whole label band as well as the narrow OCR crops: green lettering
    // may be missed by red-digit segmentation and by the small inverted crops.
    const labelLeft=Math.max(0,Math.floor(row.left-(row.right-row.left)*1.4));
    const labelRight=Math.max(labelLeft+1,Math.min(canvas.width,Math.floor(row.left)));
    const labelTop=Math.max(0,Math.floor(row.top-(row.bottom-row.top)*.25));
    const labelBottom=Math.min(canvas.height,Math.ceil(row.bottom+(row.bottom-row.top)*.25));
    const labelCanvas=document.createElement('canvas');
    labelCanvas.width=Math.max(1,(labelRight-labelLeft)*2);
    labelCanvas.height=Math.max(1,(labelBottom-labelTop)*2);
    labelCanvas.getContext('2d')?.drawImage(image,labelLeft,labelTop,labelRight-labelLeft,labelBottom-labelTop,0,0,labelCanvas.width,labelCanvas.height);
    await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''});
    const fullLabelText=(await worker.recognize(labelCanvas.toDataURL('image/png'))).data.text;
    if(/\b(?:MY\s*(?:DIESEL|D)|NESTE\s*MY)\b/i.test(fullLabelText))continue;
    const fullLabel=fuelRowLabel(fullLabelText);
    if(fullLabel)labelVotes.set(fullLabel,(labelVotes.get(fullLabel)||0)+2);
    const labels=[...labelVotes].sort((a,b)=>b[1]-a[1]);
    const label=labels[0]&&labels[0][1]>=(labels[1]?.[1]||0)*2?labels[0][0]:null;
    trace('led-row-label',{rowIndex,label,labels});
    if(!label)continue;
    review=true;
    if(seen.has(label)){prices[label]='';continue;}seen.add(label);
    const segments=fuelLedSegments(pixels.data,canvas.width,canvas.height,row);
    const candidates:{price:string;view:string}[]=[];
    // Tesseract can stall for tens of seconds on one LED crop in mobile Safari.
    // Use the pixel-segment reading first, and stop when two OCR views agree.
    if(!segments){
      await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:'0123456789.,'});
      for(const [red,invert,threshold] of [[false,false,0],[true,false,0],[false,true,0]] as const){
        const view=`${red}:${invert}:${threshold}`;
        const p=fuelLedPrice((await worker.recognize(crop(row.left,row.right,red,invert,threshold))).data.text);
        if(p)candidates.push({price:p,view});
        if(p&&candidates.filter(candidate=>candidate.price===p).length>=2)break;
      }
    }
    const candidate=segments||fuelOcrConsensus(candidates);
    trace('led-row-price',{rowIndex,label,segments,candidates,candidate});
    // Two agreeing LED shape masks can resolve a systematic OCR error.
    // Without that evidence, disagreement with the original pass remains a conflict.
    prices[label]=segments?segments:prices[label]&&candidate&&prices[label]!==candidate?'':candidate;
    if(prices[label])onProgress?.({...prices});
  }
  trace('complete',{prices,review});
  return {prices,text:originalText,review};
}
