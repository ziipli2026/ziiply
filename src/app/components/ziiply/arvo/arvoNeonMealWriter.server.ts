import type {ArvoMealWrite} from "./arvoMealWrite.server.ts";

export type ArvoSqlExecutor={query:(sql:string,params:readonly unknown[])=>Promise<{rows:readonly Record<string,unknown>[]}>};

/**
 * Backend-only parameterized adapter. The SQL function itself locks and
 * rechecks consent within the insert transaction; never use direct INSERT.
 */
export function createArvoNeonMealWriter(db:ArvoSqlExecutor):ArvoMealWrite {
 return async (userId,meal)=>{
  const result=await db.query(
   "SELECT public.ziiply_arvo_insert_meal($1::uuid,$2::uuid,$3::timestamptz,$4::text,$5::text,$6::numeric,$7::numeric,$8::numeric,$9::numeric,$10::numeric) AS inserted",
   [userId,meal.id,meal.timestamp,meal.ean,meal.name,meal.grams,meal.nutrition.kcal,meal.nutrition.protein,meal.nutrition.carbs,meal.nutrition.fat],
  );
  // false means a durable deletion or preexisting ID: do not report it as newly saved.
  if(result.rows.length!==1||result.rows[0]?.inserted!==true)throw Error("arvo-meal-not-inserted");
 };
}
