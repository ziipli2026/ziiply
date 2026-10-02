import {readFileSync,writeFileSync} from "node:fs";
const data=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const rules=[
["Maitotuotteet",/\b(maito|jogurtti|rahka|kerma|juusto|kananmuna)\b/i],
["Kahvi & tee",/\b(kahvi|suodatinkahvi|kahvipapu|teepussi)\b/i],
["Juomat",/\b(limonadi|virvoitusjuoma|kivennäisvesi|mehujuoma|energiajuoma)\b/i],
["Kodinhoito",/\b(pyykinpesuaine|astianpesuaine|huuhteluaine|talouspaperi|wc-paperi)\b/i],
["Hygienia & kosmetiikka",/\b(hammastahna|shampoo|deodorantti|suihkusaippua|terveysside)\b/i],
["Kuivatuotteet",/\b(makaroni|spagetti|riisi|vehnäjauho|kaurahiutale|ruokaöljy)\b/i],
["Lemmikit",/\b(kissanruoka|koiranruoka|kissanhiekka)\b/i]];
const blocked=/lelu|muki|paristo|akku|vaate|kenkä|sukka|auton|pyörän|koriste|lahjapakkaus|kahvinkeitin|teekannu/i;
const proposals=[],unresolved=[];
for(const item of data.items){
 if(item.productClass!=="review"||String(item.existingCategory).toLowerCase()!=="muut")continue;
 const name=String(item.name||"");
 const matches=rules.filter(([,re])=>re.test(name)).map(([label])=>label);
 const category=matches.length===1&&!blocked.test(name)?matches[0]:"";
 const entry={ean:item.ean,name,brand:item.brand,existingCategory:item.existingCategory,proposedCategory:category,reason:category?"name-based suggestion; manual approval required":"insufficient or ambiguous evidence"};
 (category?proposals:unresolved).push(entry);
}
writeFileSync("tokmanni-spar-muut-triage.json",JSON.stringify({summary:{proposals:proposals.length,unresolved:unresolved.length,autoApproved:0,neonWrites:0},proposals,unresolved},null,2));
console.log(JSON.stringify({proposals:proposals.length,unresolved:unresolved.length,autoApproved:0,neonWrites:0}));
