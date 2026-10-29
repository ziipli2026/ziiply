// Read-only Ruoanhinta adapter for isolated Neon-first simulation.
// Store IDs are explicit test-store fixtures, never inferred from a user location.
export function createRuoanhintaPriceLookup(stores, fetcher=fetch) {
  const selected=stores.filter(s=>['S','K'].includes(s.id)&&Number.isInteger(s.storeId)&&s.storeId>0);
  return async ({ean,name},signal)=>{
    if(!/^\d{8,14}$/.test(String(ean)))return [];
    const term=String(name||'').trim().split(/\s+/).filter(w=>w.length>=4).slice(0,2).join(' ');
    if(!term)return [];
    const results=await Promise.all(selected.map(async store=>{
      try {
        const url='https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(term)+'&storeIds='+store.storeId+'&skip=0&take=80';
        const response=await fetcher(url,{signal});
        if(!response.ok)throw Error('HTTP '+response.status);
        const data=await response.json();
        if(!Array.isArray(data.items))return [];
        return data.items.filter(item=>String(item.ean||'')===String(ean)).flatMap(item=>{
          const match=(item.storeItems||[]).find(x=>Number(x.storeId)===store.storeId&&typeof x.price==='number'&&Number.isFinite(x.price)&&x.price>0);
          return match?[{ean:String(ean),store:store.id,price:match.price}]:[];
        });
      } catch(error) {
        if(signal.aborted)throw error;
        return [];
      }
    }));
    return results.flat();
  };
}
