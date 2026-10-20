import assert from "node:assert/strict";
import { fineliRawProduceName as match } from "../src/app/api/ean-bank/fineliProduceMatcher";
for(const [name,brand,expected] of [
 ["Kotimaista porkkana 500 g","Kotimaista","PORKKANA"],
 ["Kotimaista porkkana 1 kg","Kotimaista","PORKKANA"],
 ["Pirkka suomalainen kesäporkkana 500g 1lk","Pirkka","PORKKANA"],
 ["Kotimaista porkkananippu","Kotimaista","PORKKANA"],
 ["Porkkana ulkomainen",null,"PORKKANA"],
 ["Sipuli",null,"SIPULI"],
 ["Valkosipuli",null,"VALKOSIPULI"],
 ["Pirkka suomalainen kurkku 350 g","Pirkka","KURKKU"],
 ["Pirkka porkkanakakku 500g","Pirkka",null],
 ["Coop pikkuporkkanat 450 g pakaste","Coop",null],
 ["Atria grilliporkkanat aasialaisittain 500g","Atria",null],
 ["Juustoportti Porkkanasose 500g","Kasvis Galleria",null],
 ["Pfanner Bio Luomu porkkanatäysmehu 0,5l","Pfanner",null],
 ["Pirkka tomaatti-mozzarellasalaatti","Pirkka",null],
 ["Pirkka perunamuusi 500g","Pirkka",null],
 ["Oat King Energiavälipalapatukka 90g porkkanakakku",null,null],
] as const) assert.equal(match(name,brand),expected,name);
console.log("Fineli raw produce matcher regression passed");
