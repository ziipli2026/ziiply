import { parseRecipeIngredient, prepareRecipeSearch, classifyRecipeIngredient, type RecipeIngredient } from "./recipeCore";

/** Keep the displayed ingredient and the item sent to Justiina on the same parser. */
export function onlineRecipeIngredients(content:string): RecipeIngredient[] {
  const items:RecipeIngredient[]=[];
  let active=false;
  const heading=/^(?:ainekset|raaka-aineet|ainesosat|valinnaiset ainekset|tarvikkeet|tarvitset)(?:\s+[^:\n]+?\s+(?:hengelle|henkilölle|annokselle|annosta|hlö))?\s*:?$/i;
  const hasHeading=content.split(/\n/).some(line=>heading.test(line.trim()));
  let method=false;
  for(const raw of content.split(/\n/)){
    const line=raw.replace(/^[•*–-]\s*/,"").trim();
    if(heading.test(line)){active=true;continue;}
    if(/^(valmistus|valmistaminen|valmistusohje|ohje|työvaiheet|tekeminen|vinkkejä|sukulaiset|linkit|katso myös|aiheesta muualla)\s*:?$/i.test(line)){active=false;method=true;continue;}
    if(!hasHeading&&!method&&/^(?:n\.?\s*)?[\d½¼¾⅓⅔⅛]/.test(line))active=true;
    if(/^(?:kuivat|nestemäiset|perustaikina|taikina|pohja|täyte|kastike|lisäksi|päälle|pinnalle|voiteluun|paistamiseen|tarjoiluun)\s*:?$/i.test(line))continue;
    if(/^(?:tarvitset myös|sekoita|keitä|paista|kuori|lisää|kuumenna|tarjoile|hienonna|ruskista|kuullota|leikkaa)\b/i.test(line))continue;
    if(!active||!line||items.length>=35||/^(tässä on|jos haluat|voit lisätä)/i.test(line))continue;
    if(line.length>=110)continue;
    // Written Finnish units occur in wiki recipes as well as abbreviations.
    const normalized=line.replace(/\b(?:litraa|litra)\b/gi,"l").replace(/\b(?:desilitraa|desilitra)\b/gi,"dl")
      .replace(/\b(?:grammaa|gramma)\b/gi,"g").replace(/\b(?:kilogrammaa|kilogramma)\b/gi,"kg")
      .replace(/\b(?:teelusikallista|teelusikkaa)\b/gi,"tl").replace(/\b(?:ruokalusikallista|ruokalusikkaa)\b/gi,"rkl")
      .replace(/^(yksi|kaksi|kolme|neljä|viisi|kuusi)\s+/i,(_,word:string)=>String(["yksi","kaksi","kolme","neljä","viisi","kuusi"].indexOf(word.toLowerCase())+1)+" ");
    const item=parseRecipeIngredient(normalized,"online-"+items.length);
    if(!item.name)continue;
    // An unqualified quantity in an ingredient list counts the named items.
    if(item.amount!==null&&!item.unit&&!/^cm\b/i.test(normalized.replace(/^[\d.,\s]+/,""))){item.unit="kpl";item.uncertain=/[?]|\s+tai\s+|^(?:pala|palan)\b/i.test(item.name);}
    item.uncertain ||= !classifyRecipeIngredient(item.name);
    item.sourceLine=line;
    items.push(item);
  }
  return items;
}

export function onlineRecipeDisplayIngredients(content:string){
  return onlineRecipeIngredients(content).map(item=>{
    const source=item.sourceLine||item.name;
    const alternatives=/\s+(?:tai|ja\s*\/\s*tai)\s+/i.test(source)&&!/\([^)]*\btai\b[^)]*\)/i.test(source);
    // The editor/search use the parsed first choice; the displayed recipe must
    // retain every explicit choice and its own quantity from the source line.
    return {name:alternatives?source:item.name,
      amount:alternatives?"":item.amount===null?"Täydennettävä":String(item.amount).replace(".",",")+(item.unit?" "+item.unit:""),
      complete:!item.uncertain};
  });
}

/** A body-text search hit is insufficient: every query word must match the dish title. */
export function onlineRecipeTitleMatches(title:string,query:string):boolean {
  const words=(value:string)=>value.toLocaleLowerCase("fi").normalize("NFKC").replace(/^keittokirja\//,"").match(/[\p{L}\p{N}]+/gu)||[];
  const wanted=words(query), actual=words(title);
  return wanted.length>0&&wanted.every(word=>actual.some(name=>name===word||(word.length>=5&&name.endsWith(word))));
}

/** Use the same plan as the editor, including protein requirements and tap-water exclusion. */
export function onlineRecipeSearchPlan(content:string,title:string){
 const method=content.split(/\n(?:Valmistus|Valmistaminen|Ohje|Valmistusohje)\s*:?\s*\n/i);
 return prepareRecipeSearch(onlineRecipeIngredients(content),method.length>1?method.slice(1).join("\n"):"",title);
}

/** Query changes must not leave a prior dish visible during debounce/network work. */
export function onlineRecipeMatchingResults<T extends {title:string}>(results:T[],query:string):T[]{
 return results.filter(recipe=>onlineRecipeTitleMatches(recipe.title,query));
}
