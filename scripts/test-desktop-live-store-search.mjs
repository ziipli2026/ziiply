// Read-only smoke test against live Ziiply store search endpoints.
// No database writes, no cart mutations, and no deployments.
const assert=require("node:assert/strict");
const base=process.env.ZIIPLY_TEST_BASE_URL||"https://ziiply.fi";
const stores=[
  {chain:"S",path:"/api/s-products",store:"634976534",storeName:"Prisma Hyvinkää"},
  {chain:"K",path:"/api/k-products",store:"N183",storeName:"K-Citymarket Hyvinkää"}
];
const searches=["kevytmaito","jogurtti","kahvi","cola"];
let failed=0,seen=0;
for(const st of stores)for(const search of searches){
 const u=new URL(st.path,base);u.searchParams.set("search",search);u.searchParams.set("store",st.store);if(st.chain==="S")u.searchParams.set("storeName",st.storeName);
 try{
  const response=await fetch(u,{headers:{accept:"application/json"},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  const items=Array.isArray(data)?data:Array.isArray(data.products)?data.products:Array.isArray(data.items)?data.items:null;
  if(!items)throw Error("Unexpected response shape");
  const priced=items.filter(p=>Number(p.price??p.storeItems?.[0]?.price)>0);
  seen+=priced.length;
  console.log("RESULT "+st.chain+" "+search+" rows="+items.length+" priced="+priced.length+" sample="+JSON.stringify(priced.slice(0,3).map(p=>({name:p.name||p.title,price:p.price??p.storeItems?.[0]?.price,category:p.category||p.categoryName||null}))));
  if(!priced.length)throw Error("No priced products returned");
 }catch(e){failed++;console.error("FAIL "+st.chain+" "+search+": "+e.message)}
}
console.log("Live store search summary: priced products="+seen+", failed queries="+failed);
assert.equal(failed,0,"Live store searches failed; inspect log (availability/network/store identifiers may need checking)");
