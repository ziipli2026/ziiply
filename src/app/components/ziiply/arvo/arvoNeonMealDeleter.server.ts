import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Delete uses the database function that atomically records the tombstone. */
export function createArvoNeonMealDeleter(db:ArvoSqlExecutor) {
 return async (userId:string,mealId:string):Promise<void>=>{
  if(!uuid.test(userId)||!uuid.test(mealId))throw Error("invalid-arvo-delete-id");
  const result=await db.query(
   "SELECT public.ziiply_arvo_delete_meal_v2($1::uuid,$2::uuid) AS deleted",
   [userId,mealId],
  );
  // Require an explicit true acknowledgement; PostgreSQL void values can be
  // driver-dependent and must not be mistaken for successful deletion.
  if(result.rows.length!==1||result.rows[0]?.deleted!==true)throw Error("arvo-meal-delete-unconfirmed");
 };
}
