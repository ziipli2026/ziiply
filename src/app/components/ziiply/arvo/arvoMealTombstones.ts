import type {ArvoMeal} from "./arvoStatistics.ts";

/** Deleted meal IDs are local tombstones; cloud deletion requires a separate authenticated API. */
export const ARVO_DELETED_MEALS_KEY = "ziiply-arvo-deleted-meals-v1";
const validId = (id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export function readArvoDeletedMealIds(storage:Pick<Storage,"getItem">): string[] {
  try {
    const value=JSON.parse(storage.getItem(ARVO_DELETED_MEALS_KEY)||"[]");
    return Array.isArray(value) ? [...new Set(value.filter((id):id is string=>typeof id==="string"&&validId(id)))]:[];
  } catch { return []; }
}
export function markArvoMealDeleted(storage:Pick<Storage,"getItem"|"setItem">,id:string):string[] {
  if(!validId(id))return readArvoDeletedMealIds(storage);
  const next=[...new Set([...readArvoDeletedMealIds(storage),id])];
  storage.setItem(ARVO_DELETED_MEALS_KEY,JSON.stringify(next));
  return next;
}
export function excludeArvoDeletedMeals(meals:readonly ArvoMeal[],deletedIds:readonly string[]):ArvoMeal[] {
  const deleted=new Set(deletedIds);
  return meals.filter(meal=>!deleted.has(meal.id));
}

/** A newly saved meal supersedes a pending deletion of the same identifier. */
export function clearArvoMealDeleted(storage:Pick<Storage,"getItem"|"setItem">,id:string):string[] {
  const next=readArvoDeletedMealIds(storage).filter(existing=>existing!==id);
  storage.setItem(ARVO_DELETED_MEALS_KEY,JSON.stringify(next));
  return next;
}

/** Persist server tombstones before reconciling offline meals. */
export function persistArvoRemoteDeletedIds(
  storage:Pick<Storage,"getItem"|"setItem">,
  remoteIds:readonly string[],
):string[] {
  const next=[...new Set([...readArvoDeletedMealIds(storage),...remoteIds.filter(validId)])];
  storage.setItem(ARVO_DELETED_MEALS_KEY,JSON.stringify(next));
  return next;
}
