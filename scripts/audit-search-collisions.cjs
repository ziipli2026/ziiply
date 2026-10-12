#!/usr/bin/env node
// Diagnostic only: identify ambiguous substrings before expanding category rules.
const fs=require("node:fs");
const source=fs.readFileSync("src/app/components/ziiply/search/searchCategoryRegistry.ts","utf8");
const section=source.split("const SEARCH_INTENTS: SearchIntent[] = [")[1]?.split("\n];")[0];
if(!section)throw Error("Missing SEARCH_INTENTS");
const entries=[...section.matchAll(/category:\s*"([^"]+)"[\s\S]*?(?=\bcategory:\s*"|$)/g)].map(m=>{
 const part=m[0];
 const variants=part.match(/variants:\s*(\[[^\]]*\])/);
 const words=variants?[...variants[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]):[];
 return {category:m[1],words};
});
const collisions=[];
for(const target of entries)for(const term of target.words){
 const prior=entries.filter(x=>x.category!==target.category).flatMap(x=>x.words.map(word=>({category:x.category,word}))).filter(x=>term!==x.word&&term.includes(x.word)&&x.word.length>=3);
 if(prior.length)collisions.push({term,expected:target.category,overlaps:prior});
}
console.log(JSON.stringify({categories:entries.length,collisionCount:collisions.length,collisions:collisions.slice(0,100)},null,2));
// This report is informational until each collision has a reviewed expected behavior.
