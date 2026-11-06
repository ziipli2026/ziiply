import {NextRequest,NextResponse} from "next/server";
import {ARVO_BETA_COOKIE_NAME} from "../../../components/ziiply/arvo/arvoBetaSessionBridge.server.ts";
import {executeArvoCloudOperation} from "../../../components/ziiply/arvo/arvoCloudOperation.server.ts";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
const deny=(status:number)=>NextResponse.json({ok:false,error:status===401?"unauthorized":"unavailable"},{status,headers:noStore});

/** Read-only endpoint. The beta session token comes exclusively from the
 * secure HttpOnly cookie, never from query parameters or request JSON.
 * Cloud access requires explicit consent and an eligible active beta account.
 */
export async function GET(request:NextRequest){
 if(process.env.ZIIPLY_ARVO_CLOUD_API_ENABLED!=="true")return deny(404);
 if(!process.env.DATABASE_URL)return deny(503);
 const token=request.cookies.get(ARVO_BETA_COOKIE_NAME)?.value??null;
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return deny(401);
 try{
  const result=await executeArvoCloudOperation(token,"read");
  if(!result.ok)return deny(result.reason==="unauthorized"?401:503);
  return NextResponse.json(result,{headers:noStore});
 }catch{return deny(503);}
}
