import React from "react";

export default function FuelStationBackdrop({ chain }: { chain: "Neste" | "ABC" | "St1" | "SEO" | "Muut" }) {
  // Each chain has a distinct architectural silhouette, not a recolored common building.
  const pump = (x:number, color:string) => <g key={x}><rect x={x} y="112" width="20" height="37" rx="3" fill="#f2f0e7" stroke={color} strokeWidth="2.5"/><rect x={x+4} y="117" width="12" height="13" fill="#9eb9b8"/><path d={`M${x+20} 119 q12 1 12 13 v13`} stroke="#666b65" strokeWidth="3" fill="none"/></g>;
  return <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[66%] overflow-hidden opacity-[.58]">
    <svg viewBox="0 0 440 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
      <path d="M0 151 H440 V160 H0Z" fill="#c3b8a4" opacity=".35"/>
      {chain === "Neste" && <g transform="translate(118 0)">
        <path d="M136 70 L156 48 H343 L358 70 V150 H136Z" fill="#e0ebe7" stroke="#91aaa5" strokeWidth="2"/>
        <path d="M148 72 H345 V84 H148Z" fill="#328b85"/>
        <path d="M158 90 H214 V137 H158Z M222 90 H278 V137 H222Z M286 90 H333 V137 H286Z" fill="#8bbdb9" stroke="#f4f7ef" strokeWidth="5"/>
        <path d="M-8 77 L45 42 H256 L284 61 V82 H-8Z" fill="#eaf0eb" stroke="#327e7a" strokeWidth="3"/>
        <path d="M-5 70 H280 V82 H-5Z" fill="#228e89"/><path d="M12 82 V150 M246 82 V150" stroke="#a2aaa6" strokeWidth="7"/>
        {pump(38,"#348f8a")}{pump(203,"#348f8a")}
      </g>}
      {chain === "ABC" && <g transform="translate(118 0)">
        <path d="M76 66 L110 31 H343 L383 66 V150 H76Z" fill="#e6e8dd" stroke="#a0ad9c" strokeWidth="2"/>
        <path d="M111 32 H341 L379 67 H77Z" fill="#167a4b"/>
        <path d="M96 75 H361 V90 H96Z" fill="#237f53"/>
        <path d="M112 95 H171 V141 H112Z M180 95 H239 V141 H180Z M248 95 H308 V141 H248Z M316 95 H351 V141 H316Z" fill="#a2c6b1" stroke="#f2f3e9" strokeWidth="5"/>
        <path d="M-10 93 L32 70 H155 L179 87 V99 H-10Z" fill="#e7eee1" stroke="#1e7647" strokeWidth="3"/>
        <path d="M-5 91 H178 V103 H-5Z" fill="#16824b"/><path d="M17 103 V150 M151 103 V150" stroke="#9aa99a" strokeWidth="7"/>
        {pump(42,"#247e51")}
      </g>}
      {chain === "St1" && <g transform="translate(118 0)">
        <path d="M182 72 L197 52 H393 V150 H182Z" fill="#e9e7e3" stroke="#aaa9a4" strokeWidth="2"/>
        <path d="M188 69 H392 V81 H188Z" fill="#c7353d"/>
        <path d="M204 88 H251 V139 H204Z M260 88 H307 V139 H260Z M316 88 H377 V139 H316Z" fill="#a7bbc1" stroke="#f5f3ef" strokeWidth="5"/>
        <path d="M-15 69 L22 44 H262 L294 69 V88 H-15Z" fill="#f1f0eb" stroke="#bd3039" strokeWidth="3"/>
        <path d="M-10 73 H293 V89 H-10Z" fill="#d33c42"/><path d="M18 89 V151 M265 89 V151" stroke="#9a9d9d" strokeWidth="8"/>
        <path d="M-8 69 H289" stroke="#f7f7f1" strokeWidth="5"/>
        {pump(55,"#d23b42")}{pump(218,"#d23b42")}
      </g>}
      {chain === "SEO" && <g transform="translate(118 0)">
        <path d="M164 81 L196 57 H374 L399 81 V150 H164Z" fill="#e9e5d9" stroke="#a8ad99" strokeWidth="2"/>
        <path d="M196 58 H375 L396 82 H165Z" fill="#3c7841"/>
        <path d="M183 92 H233 V140 H183Z M241 92 H291 V140 H241Z M299 92 H381 V140 H299Z" fill="#a5b9aa" stroke="#f0f0e4" strokeWidth="5"/>
        <path d="M5 97 L26 78 H189 L206 97 V109 H5Z" fill="#f3f1e4" stroke="#397443" strokeWidth="3"/>
        <path d="M6 101 H205 V113 H6Z" fill="#48844b"/><path d="M27 113 V150 M186 113 V150" stroke="#9aa59a" strokeWidth="7"/>
        {pump(55,"#3d8046")}{pump(145,"#3d8046")}
      </g>}
      {chain === "Muut" && <g transform="translate(118 0)">
        <path d="M142 84 L181 43 H321 L356 84 V150 H142Z" fill="#e6ddc8" stroke="#ae9b7b" strokeWidth="2"/>
        <path d="M181 43 H322 L359 85 H141Z" fill="#9b7950"/>
        <path d="M162 94 H221 V143 H162Z M230 94 H287 V143 H230Z M295 94 H335 V143 H295Z" fill="#aebdb8" stroke="#f4ecdc" strokeWidth="5"/>
        <path d="M15 107 L34 88 H139 L155 107 V116 H15Z" fill="#f0e5ce" stroke="#ac8852" strokeWidth="3"/>
        <path d="M15 107 H155 V119 H15Z" fill="#b69259"/><path d="M37 119 V150 M136 119 V150" stroke="#b3a48e" strokeWidth="6"/>
        {pump(56,"#b38b52")}
      </g>}
    </svg>
  </div>;
}
