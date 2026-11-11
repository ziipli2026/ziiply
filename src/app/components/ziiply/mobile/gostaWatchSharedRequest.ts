// Share one offer-watcher request across desktop consumers, as on mobile.
type WatchResponse={ok?:boolean;partial?:boolean;results?:unknown[];error?:string;diagnostic?:{publications?:number;inspected?:number;sources?:unknown[];nearby?:unknown[]}};
const pending=new Map<string,Promise<{response:Response;data:WatchResponse}>>();
export function fetchSharedGostaWatch(url:string):Promise<{response:Response;data:WatchResponse}>{
 const existing=pending.get(url);
 if(existing)return existing;
 const promise=fetch(url,{cache:"no-store",signal:AbortSignal.timeout(30000)}).then(async response=>{
  const data=await response.json() as WatchResponse;
  if(!response.ok||!data.ok||!Array.isArray(data.results))throw new Error(String(data.error||"Tarjousvahdin API epäonnistui"));
  return {response,data};
 }).finally(()=>{if(pending.get(url)===promise)pending.delete(url);});
 pending.set(url,promise);
 return promise;
}
