import {arvoUserCloudCacheKey} from "./arvoMealCloudSnapshot.ts";

/** Purge the current account's cloud cache on sign-out or account switch.
 * Never erase the shared offline meal diary.
 */
export function clearArvoCloudMealCache(
 storage:Pick<Storage,"removeItem">,
 authenticatedUserId:string,
):void{
 storage.removeItem(arvoUserCloudCacheKey(authenticatedUserId));
}

/** Cloud cache is private account data. Only access it after a fresh,
 * server-verified session check; never trust a userId supplied by the browser.
 */
export function readArvoCloudMealCache(
 storage:Pick<Storage,"getItem">,
 authenticatedUserId:string,
):{meals:unknown[];deletedIds:unknown[]}|null{
 const raw=storage.getItem(arvoUserCloudCacheKey(authenticatedUserId));
 if(!raw)return null;
 try{
  const data=JSON.parse(raw);
  if(!data||!Array.isArray(data.meals)||!Array.isArray(data.deletedIds))return null;
  return {meals:data.meals,deletedIds:data.deletedIds};
 }catch{return null;}
}
