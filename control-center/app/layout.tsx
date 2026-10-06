import type { ReactNode } from "react";
export const metadata={title:"Ziiply Control Center",description:"Internal Ziiply operations dashboard"};
export default function Layout({children}:{children:ReactNode}){return <html lang="fi"><body style={{margin:0,background:"#f3f5f7",color:"#17202a",fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>{children}</body></html>}
