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
const proposals=[],unresolved=[],departmentStore=[];
const department=/kuulok|tehosekoitin|painekeitin|paistinpannu|wokkipannu|valualumiinipata|imuri|lelu|hahmot|autolelu|valaisin|laturi|puhelin|pistorasia|porakone|sisust|matto|verho|pyyhe|kenkä|sukat|takki|housut|paita|työkalu|polkupyör|grilli|termos|muki|lautanen|aterimet|pentuaitaus|auton polttimo|ajoneuvopolttimo|merkkivalopolttimo|polttimo osram|verenpainemittari|ompelukone|pohjallinen|sytytyspala|palakuivike|koivuhiili|talutin|pehmo [0-9]|auto [0-9]/i;
const additional=[
["Hygienia & kosmetiikka",/päivävoide|yövoide|vartalotuoksu|silmänympärysvoide|kosteusvoide|kangasnaamio|silmänalusnaamio|uv-voide|rakkolaastari|huuliherpeslaastari|huulirasva|käsivoide|kasvovoide/i],
["Kodinhoito",/tahranpoistaja|pesuaine|puhdistusaine|talouspaperi|wc-paperi|roskapussi/i],
["Lemmikit",/pentualusta|kissanruoka|koiranruoka|kissanhiekka/i],
["Makeiset & keksit",/suklaa|karkki|makeispussi|täytekeksi/i],
["Juomat",/virvoitusjuoma|energiajuoma|kivennäisvesi|mehujuoma/i],
["Leipomo",/ruisleipä|näkkileipä|paahtoleipä/i],
["Hygienia & kosmetiikka",/kasvonaamio|vartaloemulsio|pikkuhousunsuoj|tampon|vaihtoharja|hammasharj|intiimipesu|käsisaippua/i],
["Kodinhoito",/wc-raikastin|wc-puhdistus|astianpesutabletti|yleispuhdistusaine/i]
];
for(const item of data.items){
 if(item.productClass!=="review"||String(item.existingCategory).toLowerCase()!=="muut")continue;
 const name=String(item.name||"");
 if(department.test(name)){departmentStore.push({ean:item.ean,name,brand:item.brand,proposedClass:"department_store",reason:"non-daily name; review required"});continue;}
 const matches=[...new Set([...rules,...additional].filter(([,re])=>re.test(name)).map(([label])=>label))];
 const category=matches.length===1&&!blocked.test(name)?matches[0]:"";
 const entry={ean:item.ean,name,brand:item.brand,existingCategory:item.existingCategory,proposedCategory:category,reason:category?"name-based suggestion; manual approval required":"insufficient or ambiguous evidence"};
 (category?proposals:unresolved).push(entry);
}
writeFileSync("tokmanni-spar-muut-triage.json",JSON.stringify({summary:{proposals:proposals.length,departmentStore:departmentStore.length,unresolved:unresolved.length,autoApproved:0,neonWrites:0},proposals,departmentStore,unresolved},null,2));
console.log(JSON.stringify({proposals:proposals.length,departmentStore:departmentStore.length,unresolved:unresolved.length,autoApproved:0,neonWrites:0}));
