// Manual observation metadata only. A shelf/scale code is not a verified product EAN.
export function classifyLidlObservedBarcode(value, origin) {
 const code=String(value??"").trim();
 if (!["packaging","paistopiste-shelf","scale-label"].includes(origin)) return {kind:"unknown",ean:null,code:null};
 if (!/^\d{8,14}$/.test(code)) return {kind:"invalid",ean:null,code:null};
 if (origin==="paistopiste-shelf") return {kind:"paistopiste-shelf-code",ean:null,code};
 if (origin==="scale-label") return {kind:"scale-label-code",ean:null,code};
 // Packaging code still needs manual package verification before EAN-bank admission.
 return {kind:"packaging-code-unverified",ean:null,code};
}
