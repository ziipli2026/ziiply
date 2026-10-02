import {readFileSync,writeFileSync} from "node:fs";
const data=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const rules=[
["Maitotuotteet",/(?:^|[^a-zåäöA-ZÅÄÖ])(maito|jogurtti|rahka|kerma|juusto|kananmuna)(?=$|[^a-zåäöA-ZÅÄÖ])/i],
["Kahvi & tee",/(?:^|[^a-zåäöA-ZÅÄÖ])(kahvi|suodatinkahvi|kahvipapu|teepussi)(?=$|[^a-zåäöA-ZÅÄÖ])/i],
["Juomat",/(?:^|[^a-zåäöA-ZÅÄÖ])(limonadi|virvoitusjuoma|kivennäisvesi|mehujuoma|energiajuoma)(?=$|[^a-zåäöA-ZÅÄÖ])/i],
["Kodinhoito",/(?:^|[^a-zåäöA-ZÅÄÖ])(pyykinpesuaine|astianpesuaine|huuhteluaine|talouspaperi|wc-paperi)(?=$|[^a-zåäöA-ZÅÄÖ])/i],
["Hygienia & kosmetiikka",/(?:^|[^a-zåäöA-ZÅÄÖ])(hammastahna|shampoo|deodorantti|suihkusaippua|terveysside)(?=$|[^a-zåäöA-ZÅÄÖ])/i],
["Kuivatuotteet",/(?:^|[^a-zåäöA-ZÅÄÖ])(makaroni|spagetti|riisi|vehnäjauho|kaurahiutale|ruokaöljy)(?=$|[^a-zåäöA-ZÅÄÖ])/i],
["Lemmikit",/(?:^|[^a-zåäöA-ZÅÄÖ])(kissanruoka|koiranruoka|kissanhiekka)(?=$|[^a-zåäöA-ZÅÄÖ])/i]];
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
