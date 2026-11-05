import {hashArvoBetaSessionToken} from "./arvoBetaSessionBridge.server.ts";
import {createArvoNeonSessionLookup} from "./arvoNeonSessionLookup.server.ts";
import {createArvoNeonConsentSessionLookup} from "./arvoNeonConsentSessionLookup.server.ts";
import {createArvoNeonMealReader} from "./arvoNeonMealReader.server.ts";
import {createArvoNeonMealWriter} from "./arvoNeonMealWriter.server.ts";
import {createArvoNeonMealDeleter} from "./arvoNeonMealDeleter.server.ts";
import {createArvoNeonConsentWriter} from "./arvoNeonConsentWriter.server.ts";
import {readArvoCloudMeals} from "./arvoMealRead.server.ts";
import {writeArvoCloudMeal} from "./arvoMealWrite.server.ts";
import {deleteArvoCloudMeal} from "./arvoMealDelete.server.ts";
import {updateArvoCloudMealConsent} from "./arvoMealConsent.server.ts";
import {withArvoNeonDatabase} from "./arvoNeonDatabase.server.ts";

/** A single server-side entry point. The caller MUST read the HttpOnly
 * beta cookie itself and enforce same-origin CSRF protection on mutations.
 * No API route is exposed until beta login is present on the same branch.
 */
export async function executeArvoCloudOperation(
 rawServerCookie:string|null,
 operation:"read"|"write"|"delete"|"grant"|"revoke",
 payload?:unknown,
 connectionString:string|undefined=process.env.DATABASE_URL,
){
 return withArvoNeonDatabase(connectionString,async db=>{
  const sessionLookup=createArvoNeonSessionLookup(db);
  if(operation==="read")
   return readArvoCloudMeals(rawServerCookie,sessionLookup,hashArvoBetaSessionToken,createArvoNeonMealReader(db));
  if(operation==="write")
   return writeArvoCloudMeal(rawServerCookie,payload,sessionLookup,hashArvoBetaSessionToken,createArvoNeonMealWriter(db));
  if(operation==="delete")
   return deleteArvoCloudMeal(rawServerCookie,payload,sessionLookup,hashArvoBetaSessionToken,createArvoNeonMealDeleter(db));
  if(operation==="grant"||operation==="revoke")
   return updateArvoCloudMealConsent(rawServerCookie,operation,createArvoNeonConsentSessionLookup(db),hashArvoBetaSessionToken,createArvoNeonConsentWriter(db));
  throw Error("arvo-unsupported-cloud-operation");
 });
}
