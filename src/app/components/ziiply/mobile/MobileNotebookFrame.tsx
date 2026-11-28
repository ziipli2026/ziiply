"use client";
import React from "react";
import { createPortal } from "react-dom";
export default function MobileNotebookFrame({children,className="",sectionStyle,version}:{children:React.ReactNode;className?:string;sectionStyle?:React.CSSProperties;version?:string}) {
 const [mounted,setMounted]=React.useState(false);
 React.useEffect(()=>setMounted(true),[]);
 if(!mounted)return null;
 return createPortal(<div data-ziiply-mobile-offer-search-card-version={version} className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+7.75rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md ${className}`}><section style={sectionStyle} className="relative flex h-full min-h-0 w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{ backgroundImage: "url('/ui/cart/vihkonen.webp')", backgroundSize: "142% 104%", backgroundPosition: "center top" }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.42),rgba(246,226,172,0.18)_34%,rgba(238,214,156,0.08))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />
{children}</section></div>,document.body);
}
