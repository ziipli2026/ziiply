// Locate bright red display rows without assuming fuel order or station branding.
export function findFuelLedRows(pixels:ArrayLike<number>,width:number,height:number,bright=false):{left:number;right:number;top:number;bottom:number}[]{
  const step=Math.max(1,Math.round(Math.min(width,height)/180)),w=Math.ceil(width/step),h=Math.ceil(height/step);
  const mask=new Uint8Array(w*h),expanded=new Uint8Array(w*h);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(bright?r>220&&g>110&&b>90&&r>g*1.1&&r>b*1.2:r>120&&r>g*1.8&&r>b*1.6)mask[Math.floor(y/step)*w+Math.floor(x/step)]=1;
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x])
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)expanded[(y+dy)*w+x+dx]=1;
  const components:{left:number;right:number;top:number;bottom:number}[]=[];
  for(let seed=0;seed<expanded.length;seed++)if(expanded[seed]){
    const queue=[seed];expanded[seed]=0;let left=w,right=0,top=h,bottom=0;
    for(let k=0;k<queue.length;k++){
      const n=queue[k],x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h){const next=(y+dy)*w+x+dx;if(expanded[next]){expanded[next]=0;queue.push(next);}}
    }
    if(bottom-top>=Math.max(4,h*.035)&&bottom-top<h*.35)components.push({left,right,top,bottom});
  }
  components.sort((a,b)=>a.left-b.left);
  const rows:typeof components=[];
  for(const c of components){
    const row=rows.find(r=>Math.min(r.bottom,c.bottom)-Math.max(r.top,c.top)>Math.min(r.bottom-r.top,c.bottom-c.top)*.65&&c.left-r.right<Math.max(r.bottom-r.top,c.bottom-c.top)*1.2);
    if(row){row.left=Math.min(row.left,c.left);row.right=Math.max(row.right,c.right);row.top=Math.min(row.top,c.top);row.bottom=Math.max(row.bottom,c.bottom);}else rows.push({...c});
  }
  const result=rows.filter(r=>(r.right-r.left)/(r.bottom-r.top)>1.7&&(r.right-r.left)/(r.bottom-r.top)<6.5).sort((a,b)=>a.top-b.top).slice(0,6).map(r=>({left:Math.max(0,(r.left-1)*step),right:Math.min(width,(r.right+2)*step),top:Math.max(0,(r.top-1)*step),bottom:Math.min(height,(r.bottom+2)*step)}));
  if(bright)return result;
  return [...result,...findFuelLedRows(pixels,width,height,true).filter(r=>!result.some(a=>Math.abs(a.top-r.top)<(a.bottom-a.top)*.5))].sort((a,b)=>a.top-b.top).slice(0,6);
}
export function fuelLedPrice(text:string):string|null{
  const value=text.trim().replace(/\s/g,'').replace(',','.');
  // Decimal restoration is allowed only on an isolated display crop.
  if(/^[1-4]\.\d{3}$/.test(value))return value.replace('.',',');
  if(/^[1-4]\d{3}$/.test(value))return value[0]+','+value.slice(1);
  return null;
}
export function fuelRowLabel(text:string):'diesel'|'price95'|'price98'|null{
  const labels=new Set<string>();
  if(/\b95(?:\s*E\s*10)?\b/i.test(text))labels.add('price95');
  if(/\b98(?:\s*E\s*5)?\b/i.test(text))labels.add('price98');
  if(/\b(?:D|DI|DSL|Diesel)\b/i.test(text))labels.add('diesel');
  return labels.size===1?[...labels][0] as 'diesel'|'price95'|'price98':null;
}

export function fuelOcrConsensus(readings:{price:string;view:string}[]):string{
  const votes=new Map<string,Set<string>>();
  for(const {price,view} of readings){const views=votes.get(price)||new Set<string>();views.add(view);votes.set(price,views);}
  const ranked=[...votes].map(([price,views])=>[price,views.size] as const).sort((a,b)=>b[1]-a[1]);
  return ranked[0]?.[1]>=2&&ranked[0][1]>=(ranked[1]?.[1]||0)*2?ranked[0][0]:'';
}

// LED digits need a shape check: ordinary OCR commonly reads the top bar of 7 as 1.
// Read only four separate digits plus the decimal point, with two agreeing red masks.
export function fuelLedSegments(pixels:ArrayLike<number>,width:number,height:number,row:{left:number;right:number;top:number;bottom:number}):string {
  const readings:string[]=[];
  for(const brightness of [150,170,190]){
    const w=row.right-row.left,h=row.bottom-row.top,mask=new Uint8Array(w*h),columns=new Uint16Array(w);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=((row.top+y)*width+row.left+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      // Pink/red lit dots, excluding the orange board and dark display surround.
      if(r>brightness&&r>g*1.35&&r>b*1.15&&b>g*.8){mask[y*w+x]=1;columns[x]++;}
    }
    const groups:{left:number;right:number;top:number;bottom:number}[]=[];
    const gap=Math.max(2,Math.round(h*.055));
    for(let x=0;x<w;x++)if(columns[x]>1){
      const previous=groups[groups.length-1];
      if(previous&&x-previous.right<=gap)previous.right=x;
      else groups.push({left:x,right:x,top:h,bottom:0});
    }
    for(const group of groups)for(let y=0;y<h;y++)for(let x=group.left;x<=group.right;x++)if(mask[y*w+x]){group.top=Math.min(group.top,y);group.bottom=Math.max(group.bottom,y);}
    const digits=groups.filter(g=>g.bottom-g.top>h*.45);
    if(digits.length!==4)continue;
    const digitHeight=Math.max(...digits.map(g=>g.bottom-g.top+1));
    const dot=groups.find(g=>g.left>digits[0].right&&g.right<digits[1].left&&g.bottom-g.top<digitHeight*.25&&g.top>digits[0].top+digitHeight*.7);
    if(!dot||digits.some(g=>(g.bottom-g.top+1)<digitHeight*.8))continue;
    let value='';
    for(const digit of digits){
      const dw=digit.right-digit.left+1,dh=digit.bottom-digit.top+1;
      if(dw/dh<.25){value+='1';continue;}
      if(dw/dh<.3||dw/dh>.85){value='';break;}
      // Segment order: top, upper-right, lower-right, bottom, lower-left, upper-left, middle.
      const regions=[[.15,.85,0,.2],[.72,1,.2,.44],[.72,1,.56,.8],[.15,.85,.8,1],[0,.28,.56,.8],[0,.28,.2,.44],[.15,.85,.4,.6]];
      const counts=regions.map(([left,right,top,bottom])=>{
        let count=0;
        for(let y=Math.floor(top*dh);y<Math.floor(bottom*dh);y++)for(let x=Math.floor(left*dw);x<Math.floor(right*dw);x++)count+=mask[(digit.top+y)*w+digit.left+x];
        return count;
      });
      const peak=Math.max(...counts),shape=counts.map(n=>n>peak*.35?'1':'0').join('');
      const decoded:Record<string,string>={'1111110':'0','1101101':'2','1111001':'3','0110011':'4','1011011':'5','1011111':'6','1110000':'7','1111111':'8','1111011':'9'};
      if(peak<5||!decoded[shape]){value='';break;}
      value+=decoded[shape];
    }
    const price=fuelLedPrice(value);if(price)readings.push(price);
  }
  return readings.length>=2&&new Set(readings).size===1?readings[0]:'';
}
