/** Lightweight relevance ordering for broad grocery category queries.
 * Never discard valid products: direct grocery matches are sorted ahead of
 * incidental flavour, prepared-meal and pet-product mentions.
 */
const fold = (value: unknown) => String(value ?? "").toLocaleLowerCase("fi").normalize("NFC");
const RULES: Record<string, {strong: RegExp; secondary?: RegExp; weak: RegExp}> = {
  kahvi: {strong:/\b(kahvi|kahvipavut|suodatinkahvi|juhla mokka|presidentti)\b/,secondary:/kahvi(papu|jauhe|kapseli|sekoitus|paketti)|suodatinjauhe/,weak:/kahvi[- ]?(suklaa|jogurtti|jäätelö|kakku|patukka|likööri|juoma)/},
  jogurtti: {strong:/\bjogurtti\b/,secondary:/jogurtti(juoma|purkki)|\bskyr\b/,weak:/jogurtti[- ]?(kastike|patukka|rusina|mysli)/},
  maito: {strong:/\b(kevytmaito|täysmaito|rasvaton maito|maito|maitojuoma)\b/,weak:/maidoton|maito[- ]?(suklaa|kahvi|jauhe)/},
  lohi: {strong:/\b(lohi|kirjolohi|lohifilee|lohipala)\b/,secondary:/lohi(file|suikale|pala)/,weak:/koira|kissa|lemmik|sushi|pizza|wrap/},
  banaani: {strong:/\bbanaani\b/,weak:/banaani[- ]?(suklaa|jogurtti|rahka|maku|jäätelö)/},
  peruna: {strong:/\bperuna\b/,weak:/peruna[- ]?(salaatti|pizza|pasta|gnocchi|kikherne)/},
  porkkana: {strong:/\bporkkana\b/,weak:/porkkana[- ]?(leipä|sämpylä|mehu|kakku)/},
  tomaatti: {strong:/\btomaatti\b/,weak:/tomaatti[- ]?(kastike|pizza|pasta|keitto)/},
  leipä: {strong:/\b(leipä|ruisleipä|paahtoleipä|limppu)\b/,weak:/\b(leipomo|leipäveitsi|leipäkori)\b/},
  broileri: {strong:/\b(broileri|broilerin|broilerifilee|broilerisuikale)\b/,weak:/wrap|pizza|patonki|salaatti|pasta|keitto/},
};
const ALIASES: Record<string,string> = {kahvit:"kahvi",jogurtit:"jogurtti",maidot:"maito",lohet:"lohi",banaanit:"banaani",perunat:"peruna",porkkanat:"porkkana",tomaatit:"tomaatti",leivät:"leipä",broilerit:"broileri"};
export function rankGrocerySearchResults<T extends {name?: string|null; category?: string|null}>(items:T[],query:string):T[]{
  const q=fold(query).trim();
  const rule=RULES[ALIASES[q]||q];
  if(!rule)return items;
  const score=(item:T)=>{
    const name=fold(item.name), category=fold(item.category);
    const pet=/lemmik|koira|kissa|koirille|kissoille|dog\b|cat\b|\blatz\b|\bpolar pet\b|\bprimadog\b|\bpedigree\b|\bwhiskas\b|\bpurina\b|\bcarnilove\b|\bvitakraft\b|\bdreamies\b/.test(name+" "+category);
    const categoryMatch=category.includes(q)||category.includes(ALIASES[q]||q);
    let value=0;
    if(rule.strong.test(name))value+=30;
    if(rule.secondary?.test(name))value+=18;
    if(categoryMatch)value+=35;
    if(rule.weak.test(name))value-=28;
    if(pet)value-=250;
    if(q==="lohi"&&/eväsleipä|täytetty|voileipä|patonki|kolmari|remou/.test(name))value-=160;
    if(/\b(salaatti|wrap|pizza|pasta-ateria|kakku|patukka|makeinen)\b/.test(name))value-=8;
    // Exact grocery produce and staple goods must outrank flavour mentions.
    // Only broad one-word searches use this boost, never brand/model searches.
    const produce: Record<string,RegExp> = {
      banaani:/^(?:[\w-]+ )?(?:luomu )?banaani(?:\s|$)/,
      peruna:/^(?:[\w-]+ )?(?:luomu |kotimainen )?peruna(?:\s|$)/,
      porkkana:/^(?:[\w-]+ )?(?:luomu |kotimainen )?porkkana(?:\s|$)/,
      tomaatti:/^(?:[\w-]+ )?(?:luomu |kotimainen )?tomaatti(?:\s|$)/,
    };
    const canonical=ALIASES[q]||q;
    if(produce[canonical]){
      const prepared=/smoothie|patukka|puuro|pihvi|leipä|sämpylä|tikku|keitto|kastike|pesto|seos|salaatti|pakaste|mehu|pizza|pasta|mauste|jogurtti|rahka|pyree|sose|lastenruoka|välipala|wok|gratiini|kuivattu|aurinkokuivattu|paseerattu|murska|tölkki|säilyke|hilloke|levite|gnocchi|ranskanperuna/.test(name);
      if(produce[canonical].test(name)&&!prepared)value+=120;
      if(prepared)value-=75;
      if(name===canonical)value+=160;
    }
    if(canonical==="jogurtti"){
      if(/\bjogurtti\b/.test(name)&&!/patukka|mysli|kastike|salaatti|jogurttirusina|keksi|muro/.test(name))value+=90;
      if(/patukka|mysli|kastike|salaatti|jogurttirusina/.test(name))value-=100;
    }
    if(canonical==="leipä"){
      // Finnish ä is not a JavaScript \\b word character; do not use \\b
      // to recognize bread terms or a manufacturer's name as bread.
      const notBread=/kulta-tosca|bebe victoria|kahvikruunu|tosca|bebe|rahkaunelma|rahkapiirakka|unelmatorttu|pikkumunkki|juustorinkeli|kanelikranssi|munkki|piirakka|torttu|leipätiku|leipätikku|grissini|nutella|leipäveitsi|leipävuoka|leipäjuusto|leipäsiirappi|leipämallas|leipämauste|leipäkassi|leipälastu|leipälevite|wiener|kakku|pulla|leivos|voirinkeli|voipehmopala/;
      const actualBread=/(?:^|\\s)(?:ruisleipä|paahtoleipä|täysjyväleipä|näkkileipä|hapankorppu|limppu|ruispalat|rouhepalat|sämpylä|patonki|viipaleet|leipä)(?=$|[\\s,.-])/u;
      if(actualBread.test(name)&&!notBread.test(name))value+=160;
      if(notBread.test(name))value-=350;
      // A bakery brand containing "Leipä" is not itself proof of bread.
      if(/^(?:kartanon|pekan|laitilan) leipä /.test(name)&&!/(rouhepalat|ruispalat|ruisleipä|paahtoleipä|sämpylä|limppu|viipaleet)/.test(name))value-=130;
    }
    if(canonical==="broileri"){
      if(/broiler/.test(name)&&!/wrap|patonki|pizza|salaatti|voileipä|kolmari/.test(name))value+=60;
      if(/wrap|patonki|pizza|salaatti|kolmari/.test(name))value-=75;
    }
    return value;
  };
  return items.map((item,index)=>({item,index,score:score(item)})).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);
}
