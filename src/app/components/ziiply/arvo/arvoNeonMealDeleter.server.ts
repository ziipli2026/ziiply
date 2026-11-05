import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Delete uses the database function that atomically records the tombstone. */
export function createArvoNeonMealDeleter(db:ArvoSqlExecutor) {
 return async (userId:string,mealId:string):Promise<void>=>{
  if(!uuid.test(userId)||!uuid.test(mealId))throw Error("invalid-arvo-delete-id");
  const result=await db.query(
   "SELECT public.ziiply_arvo_delete_meal($1::uuid,$2::uuid) AS deleted",
   [userId,mealId],
  );
  // The SQL function returns void, represented as a single NULL-valued column.
  // Missing or ambiguous results must not be treated as successful deletion.
  if(result.rows.length!==1||!result.rows[0]||result.rows[0].deleted!==null)throw Error("arvo-meal-delete-unconfirmed");
 };
}
