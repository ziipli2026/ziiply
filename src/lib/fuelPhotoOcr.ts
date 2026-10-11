import {findFuelLedRows,fuelLedPrice,fuelRowLabel} from './fuelPhotoLed';
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
    const crop=(left:number,right:number,red:boolean,invert=false)=>{
      const c=document.createElement('canvas'),scale=invert?3:Math.min(4,Math.max(1,200/(row.bottom-row.top)));
      c.width=Math.round((right-left)*scale)+40;c.height=Math.round((row.bottom-row.top)*scale)+40;
      const x=c.getContext('2d')!;x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.drawImage(image,left,row.top,right-left,row.bottom-row.top,20,20,c.width-40,c.height-40);
      if(red||invert){const d=x.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const r=d.data[i],g=d.data[i+1],b=d.data[i+2],v=invert?255-Math.round(r*.299+g*.587+b*.114):r>90&&r>g*1.25&&r>b*1.2?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;}x.putImageData(d,0,0);}
      return c.toDataURL('image/png');
    };
    // Read the label separately; never infer fuel from top-to-bottom order.
    if(row.left<15)continue;
    await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''});
    let label:ReturnType<typeof fuelRowLabel>=null;
    for(const invert of [true,false]){const found=fuelRowLabel((await worker.recognize(crop(Math.max(0,row.left-(row.right-row.left)*.65),Math.max(1,row.left-8),false,invert))).data.text);if(found){if(label&&label!==found){label=null;break;}label=found;}}
    if(!label)continue;
    const candidates=new Map<string,number>();
    await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:'0123456789.,'});
    for(const red of [false,true]){const p=fuelLedPrice((await worker.recognize(crop(row.left,row.right,red))).data.text);if(p)candidates.set(p,(candidates.get(p)||0)+1);}
    review=true;
    if(seen.has(label)){prices[label]='';continue;}seen.add(label);
    const candidate=candidates.size===1&&[...candidates.values()][0]>=2?[...candidates.keys()][0]:'';
    // A disagreement with the original pass is also a conflict.
    prices[label]=prices[label]&&candidate&&prices[label]!==candidate?'':candidate;
  }
  return {prices,text:original.data.text,review};
}
