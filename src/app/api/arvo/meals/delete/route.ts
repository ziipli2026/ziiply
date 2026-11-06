import {NextRequest,NextResponse} from "next/server";
import {ARVO_BETA_COOKIE_NAME} from "../../../../components/ziiply/arvo/arvoBetaSessionBridge.server.ts";
import {executeArvoCloudOperation} from "../../../../components/ziiply/arvo/arvoCloudOperation.server.ts";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
const fail=(status:number)=>NextResponse.json({ok:false},{status,headers:noStore});
/** Soft-delete and tombstone a single meal, never an entire diary.
 * The SQL delete function rechecks the user's consent inside the transaction.
 */
export async function POST(request:NextRequest){
 if(process.env.ZIIPLY_ARVO_CLOUD_API_ENABLED!=="true")return fail(404);
 if(!process.env.DATABASE_URL||!process.env.ZIIPLY_PUBLIC_ORIGIN)return fail(503);
 if(request.headers.get("origin")!==process.env.ZIIPLY_PUBLIC_ORIGIN)return fail(403);
 const token=request.cookies.get(ARVO_BETA_COOKIE_NAME)?.value??null;
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return fail(401);
 const length=Number(request.headers.get("content-length")??"0");
 if(!Number.isFinite(length)||length>2048)return fail(413);
 let payload:unknown;
 try{payload=await request.json();}catch{return fail(400);}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return fail(400);
 try{
  const result=await executeArvoCloudOperation(token,"delete",(payload as Record<string,unknown>).mealId);
  if(!result.ok)return fail(result.reason==="unauthorized"?401:result.reason==="invalid-meal-id"?400:503);
  return NextResponse.json(result,{headers:noStore});
 }catch{return fail(503);}
}
