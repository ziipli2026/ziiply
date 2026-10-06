// Freshness for public Lidl.fi evidence.
// Regular unbadged observations get a short recheck window.
// Campaign observations must never outlive their advertised validity.
export function lidlEvidenceFreshUntil({observedAt,priceKind,validThrough}) {
  const observed=new Date(observedAt);
  if(!Number.isFinite(observed.getTime())) throw new Error("invalid observedAt");
  if(priceKind==="offer"||priceKind==="lidl_plus"){
    if(!validThrough) return observed.toISOString();
    const end=new Date(validThrough+"T23:59:59.999Z");
    return end>observed?end.toISOString():observed.toISOString();
  }
  const end=new Date(observed);
  end.setUTCDate(end.getUTCDate()+7);
  return end.toISOString();
}
