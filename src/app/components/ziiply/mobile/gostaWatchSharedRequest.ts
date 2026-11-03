// A single in-tab request and response for the home badge, Gösta panel and DEBUG.
// Never allow independent consumers to overwrite each other with different scans.
type WatchResponse = {ok?:boolean;partial?:boolean;results?:unknown[];error?:string;diagnostic?:{inspected?:number;publications?:number;sources?:unknown[];nearby?:unknown[]}};
const requests=new Map<string,{at:number;promise:Promise<{response:Response;data:WatchResponse}>}>();
export function fetchSharedGostaWatch(url:string,force=false):Promise<{response:Response;data:WatchResponse}>{
  const now=Date.now();
  const current=requests.get(url);
  if(current&&(!force||now-current.at<1000)&&now-current.at<30000)return current.promise;
  const promise=fetch(url,{cache:"no-store",signal:AbortSignal.timeout(40000)}).then(async response=>{
    const data=await response.json() as WatchResponse;
    if(!response.ok||!data.ok||!Array.isArray(data.results))throw new Error(String(data.error||"Tarjousvahdin API epäonnistui"));
    return {response,data};
  }).catch(error=>{if(requests.get(url)?.promise===promise)requests.delete(url);throw error;});
  requests.set(url,{at:now,promise});
  return promise;
}
