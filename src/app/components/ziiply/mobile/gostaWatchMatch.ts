/** Match saved Gösta watch terms against already-normalized offer titles. */
export function matchesGostaWatch(query:string, offer:Record<string,unknown>):boolean {
 const normalize=(value:unknown)=>String(value??"").toLocaleLowerCase("fi").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9äöå]+/g," ").trim();
 const words=normalize(query).split(/\\s+/).filter(Boolean);
 const title=normalize(offer.title||offer.name||offer.productName);
 if(!words.length||!title)return false;
 const tokens=title.split(/\\s+/);
 return words.every(word=>tokens.some(token=>token===word||token.startsWith(word)||word.length>=5&&token.startsWith(word.slice(0,-1))));
}
