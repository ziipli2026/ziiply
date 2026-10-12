#!/usr/bin/env node
// Diagnostic only: identify ambiguous substrings before expanding category rules.
const fs=require("node:fs");
const entries=require('./lib/read-search-registry.cjs')().map(rule=>({category:rule.category,words:rule.variants}));
const collisions=[];
for(const target of entries)for(const term of target.words){
 const prior=entries.filter(x=>x.category!==target.category).flatMap(x=>x.words.map(word=>({category:x.category,word}))).filter(x=>term!==x.word&&term.includes(x.word)&&x.word.length>=3);
 if(prior.length)collisions.push({term,expected:target.category,overlaps:prior});
}
console.log(JSON.stringify({categories:entries.length,collisionCount:collisions.length,collisions},null,2));
// This report is informational until each collision has a reviewed expected behavior.
