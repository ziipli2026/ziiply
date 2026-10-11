import {findFuelLedRows,fuelLedPrice,fuelRowLabel,fuelOcrConsensus} from './fuelPhotoLed';
import {parseFuelPhotoText,type FuelPrices} from './fuelPhoto';
type Worker={recognize:(image:string)=>Promise<{data:{text:string}}>;setParameters:(parameters:Record<string,string>)=>Promise<unknown>};
export async function readFuelPhoto(worker:Worker,data:string){
  const original=await worker.recognize(data),prices=parseFuelPhotoText(original.data.text);
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Kuvan avaaminen epäonnistui.'));img.src=data;});
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');if(!ctx)return {prices,text:original.data.text,review:false};
  ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  const rows=findFuelLedRows(pixels.data,canvas.width,canvas.height);
  let review=false;
  const seen=new Set<keyof FuelPrices>();
  for(const row of rows){
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
    for(const threshold of [0,30,50,80,120]){
      const found=fuelRowLabel((await worker.recognize(crop(Math.max(0,row.left-(row.right-row.left)*.65),Math.max(1,row.left-8),false,true,threshold))).data.text);
      if(found)labelVotes.set(found,(labelVotes.get(found)||0)+1);
    }
    if(labelVotes.size!==1){
      for(const threshold of [0,120]){const found=fuelRowLabel((await worker.recognize(crop(Math.max(0,row.left-(row.right-row.left)*.65),Math.max(1,row.left-8),false,true,threshold,true))).data.text);if(found)labelVotes.set(found,(labelVotes.get(found)||0)+1);}
    }
    const labels=[...labelVotes].sort((a,b)=>b[1]-a[1]);
    const label=labels[0]&&labels[0][1]>=(labels[1]?.[1]||0)*2?labels[0][0]:null;
    if(!label)continue;
    const candidates:{price:string;view:string}[]=[];
    for(const psm of ['8','7']){
      await worker.setParameters({tessedit_pageseg_mode:psm,tessedit_char_whitelist:'0123456789.,'});
      for(const [red,invert,threshold] of [[false,false,0],[true,false,0],[false,true,0],[false,true,120]] as const){const p=fuelLedPrice((await worker.recognize(crop(row.left,row.right,red,invert,threshold))).data.text);if(p)candidates.push({price:p,view:`${red}:${invert}:${threshold}`});}
    }
    review=true;
    if(seen.has(label)){prices[label]='';continue;}seen.add(label);
    const candidate=fuelOcrConsensus(candidates);
    // A disagreement with the original pass is also a conflict.
    prices[label]=prices[label]&&candidate&&prices[label]!==candidate?'':candidate;
  }
  return {prices,text:original.data.text,review};
}
