import {NextRequest,NextResponse} from "next/server";
export function middleware(req:NextRequest){
  const u=process.env.CONTROL_CENTER_USER,p=process.env.CONTROL_CENTER_PASSWORD;
  if(!u||!p)return new NextResponse("Control Center authentication is not configured.",{status:503});
  const h=req.headers.get("authorization")||"";
  let supplied="";
  try{supplied=atob(h.startsWith("Basic ")?h.slice(6):"")}catch{}
  if(supplied!==u+":"+p)return new NextResponse("Authentication required",{status:401,headers:{"WWW-Authenticate":'Basic realm="Ziiply Control Center"'}});
  return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
