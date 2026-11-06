import {NextRequest,NextResponse} from "next/server";
import {ARVO_BETA_COOKIE_NAME} from "../../../components/ziiply/arvo/arvoBetaSessionBridge.server.ts";
import {executeArvoCloudOperation} from "../../../components/ziiply/arvo/arvoCloudOperation.server.ts";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
const fail=(status:number)=>NextResponse.json({ok:false},{status,headers:noStore});
/** Explicit cloud-consent management only. Never uploads meal data.
 * The origin is matched against the configured public origin to prevent CSRF.
 * A first consent grant needs a valid beta session, not prior cloud consent.
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
 const action=(payload as Record<string,unknown>).action;
 if(action!=="grant"&&action!=="revoke")return fail(400);
 try{
  const result=await executeArvoCloudOperation(token,action);
  if(!result.ok)return fail(result.reason==="unauthorized"?401:503);
  return NextResponse.json({ok:true},{headers:noStore});
 }catch{return fail(503);}
}
