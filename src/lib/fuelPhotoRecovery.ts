import {validateFuelPrices,fuelPhotoBrand} from './fuelPhoto';
export const fuelKeys=['diesel','price95','price98'] as const;
export type RecoveryReading={prices:Record<string,number>;visible:string[];method:string;brand?:string};
export type FuelPhotoExample={id:string;signature:string;prices:Record<string,number>};
/** Retrieve confirmed visual examples, never a station's previous price. */
export function selectFuelPhotoExamples(signature:string,examples:FuelPhotoExample[]):FuelPhotoExample[]{
 if(!/^[01]{256}$/.test(signature))return [];
 return examples.filter(e=>/^[01]{256}$/.test(e.signature)&&validateFuelPrices(e.prices)&&!(e.prices.price95!=null&&e.prices.price98!=null&&e.prices.price95>e.prices.price98))
  .map(e=>({example:e,distance:[...signature].reduce((n,b,i)=>n+Number(b!==e.signature[i]),0)}))
  .filter(e=>e.distance>0&&e.distance<=112)
  .sort((a,b)=>a.distance-b.distance||a.example.id.localeCompare(b.example.id))
  .slice(0,2).map(e=>e.example);
}
export function parseRecoveryReading(value:unknown,method:string):RecoveryReading{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const prices=validateFuelPrices(v.prices)||{};
 const uncertain=Array.isArray(v.uncertain)?v.uncertain:[];
 for(const key of uncertain)if(typeof key==='string')delete prices[key];
 const visible=Array.isArray(v.visibleFuels)?fuelKeys.filter(k=>(v.visibleFuels as unknown[]).includes(k)):[];
 const brand=typeof v.stationBrand==='string'?fuelPhotoBrand(v.stationBrand):null;
 return {prices,visible,method,...(brand?{brand}:{})};
}
export function recoveryConsensus(readings:RecoveryReading[]):Record<string,number>|null{
 const visible=new Set(readings.flatMap(r=>r.visible));
 if(!visible.size)return null;
 const result:Record<string,number>={};
 for(const key of visible){
  const votes=new Map<number,Set<string>>();
  for(const r of readings){const price=r.prices[key];if(price==null)continue;const methods=votes.get(price)||new Set<string>();methods.add(r.method);votes.set(price,methods);}
  // Recover each fuel independently; a disputed diesel reading must not block 95 or 98.
  if(votes.size!==1)continue;
  const [price,methods]=[...votes][0];if(methods.size<2)continue;result[key]=price;
 }
 return Object.keys(result).length?result:null;
}

/** Show a first valid reading immediately; conflicting readings remain unresolved. */
export function recoveryPreview(readings:RecoveryReading[]):Record<string,number>{
 const result:Record<string,number>={};
 for(const key of fuelKeys){
  const values=new Set(readings.filter(r=>r.visible.includes(key)).map(r=>r.prices[key]).filter(p=>typeof p==='number'&&Number.isFinite(p)&&p>=.5&&p<=5));
  if(values.size===1)result[key]=[...values][0];
 }
 return result;
}

/** Stop early only after every observed ordinary fuel has two agreeing readings. */
export function recoveryComplete(readings:RecoveryReading[],recovered:Record<string,number>|null):boolean{
 const expected=new Set(readings.flatMap(r=>[...r.visible,...Object.keys(r.prices)]).filter(k=>fuelKeys.includes(k as typeof fuelKeys[number])));
 return expected.size>0 && recovered!==null && [...expected].every(key=>recovered[key]!=null);
}


