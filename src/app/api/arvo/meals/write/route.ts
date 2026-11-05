import {NextRequest,NextResponse} from "next/server";
import {ARVO_BETA_COOKIE_NAME} from "../../../components/ziiply/arvo/arvoBetaSessionBridge.server.ts";
import {executeArvoCloudOperation} from "../../../components/ziiply/arvo/arvoCloudOperation.server.ts";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
const fail=(status:number)=>NextResponse.json({ok:false},{status,headers:noStore});
/** An explicit meal write. Caller supplies only a meal; the authenticated
 * user is derived from the HttpOnly beta session cookie on the server.
 * The SQL insert function rechecks consent atomically and rejects tombstones.
 */
export async function POST(request:NextRequest){
 if(process.env.ZIIPLY_ARVO_CLOUD_API_ENABLED!=="true")return fail(404);
 if(!process.env.DATABASE_URL||!process.env.ZIIPLY_PUBLIC_ORIGIN)return fail(503);
 if(request.headers.get("origin")!==process.env.ZIIPLY_PUBLIC_ORIGIN)return fail(403);
 const token=request.cookies.get(ARVO_BETA_COOKIE_NAME)?.value??null;
 if(!token)return fail(401);
 const length=Number(request.headers.get("content-length")??"0");
 if(!Number.isFinite(length)||length>8192)return fail(413);
 let payload:unknown;
 try{payload=await request.json();}catch{return fail(400);}
 try{
  const result=await executeArvoCloudOperation(token,"write",payload);
  if(!result.ok)return fail(result.reason==="unauthorized"?401:result.reason==="invalid-meal"?400:503);
  return NextResponse.json(result,{headers:noStore,status:201});
 }catch{return fail(503);}
}
