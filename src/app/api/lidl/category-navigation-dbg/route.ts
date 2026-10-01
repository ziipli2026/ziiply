import {NextResponse} from "next/server";
const VERSION="LIDL-NAV-v16-20261001";
export async function GET(){
const pages=["/","/h/lihat/h10095752","/h/juustot-maitotuotteet-ja-kananmunat/h10095761","/h/kuivatuotteet/h10096095"];
const results=[];
for(const page of pages){
try{const response=await fetch("https://www.lidl.fi"+page,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});const html=await response.text();const links=[...html.matchAll(/(?:href=|\\?["'])(?:\\?["'])(\/h\/[^"'<>\\ ]+\/h\d{5,})(?:\\?["'])/g)].map(m=>m[1].replace(/\\u002F/g,"/"));const decoded=html.replace(/\\u002F/g,"/").replace(/\\\//g,"/");const candidates=[...decoded.matchAll(/\/h\/[a-z0-9-]+\/h\d{5,}/gi)].map(m=>m[0]);results.push({page,status:response.status,links:[...new Set([...links,...candidates])].slice(0,150),totalUnique:[...new Set([...links,...candidates])].length})}catch(error){results.push({page,error:String(error)})}
}
return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Discover category links from official public pages; no database writes."});
}
