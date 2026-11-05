import {Pool} from "@neondatabase/serverless";
import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";

/** Server-only database adapter for parameterized Arvo queries.
 * Do not construct this in browser code or accept a connection string from requests.
 * A fresh Pool is closed after the callback, including when a query fails.
 */
export async function withArvoNeonDatabase<T>(
 connectionString:string|undefined,
 operation:(db:ArvoSqlExecutor)=>Promise<T>,
):Promise<T>{
 if(!connectionString||!/^postgres(?:ql)?:\/\//.test(connectionString))
  throw Error("arvo-database-not-configured");
 const pool=new Pool({connectionString,max:1});
 try{
  const db:ArvoSqlExecutor={
   query:async(sql,params)=>{
    if(typeof sql!=="string"||!Array.isArray(params))
     throw Error("arvo-invalid-database-query");
    const result=await pool.query(sql,[...params]);
    return {rows:result.rows as Record<string,unknown>[]};
   },
  };
  return await operation(db);
 }finally{
  await pool.end();
 }
}
