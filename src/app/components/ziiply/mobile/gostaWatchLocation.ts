export async function gostaWatchUrl(terms:string[]):Promise<string>{
  const base="/api/offers/watch?q="+encodeURIComponent(terms.join("|"));
  if(typeof navigator==="undefined"||!navigator.geolocation)return base;
  try{
    const permission=await navigator.permissions?.query({name:"geolocation"}).catch(()=>null);
    if(permission?.state!=="granted")return base;
    const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:300000,timeout:3500}));
    return base+"&lat="+encodeURIComponent(position.coords.latitude)+"&lon="+encodeURIComponent(position.coords.longitude);
  }catch{return base;}
}
