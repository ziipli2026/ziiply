import {validateFuelPrices} from './fuelPhoto';
export const fuelKeys=['diesel','price95','price98'] as const;
export type RecoveryReading={prices:Record<string,number>;visible:string[];method:string};
export function parseRecoveryReading(value:unknown,method:string):RecoveryReading{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const prices=validateFuelPrices(v.prices)||{};
 const uncertain=Array.isArray(v.uncertain)?v.uncertain:[];
 for(const key of uncertain)if(typeof key==='string')delete prices[key];
 const visible=Array.isArray(v.visibleFuels)?fuelKeys.filter(k=>(v.visibleFuels as unknown[]).includes(k)):[];
 return {prices,visible,method};
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

/** Stop early only after every observed ordinary fuel has two agreeing readings. */
export function recoveryComplete(readings:RecoveryReading[],recovered:Record<string,number>|null):boolean{
 const expected=new Set(readings.flatMap(r=>[...r.visible,...Object.keys(r.prices)]).filter(k=>fuelKeys.includes(k as typeof fuelKeys[number])));
 return expected.size>0 && recovered!==null && [...expected].every(key=>recovered[key]!=null);
}
