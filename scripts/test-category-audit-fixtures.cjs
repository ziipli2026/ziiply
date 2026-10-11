#!/usr/bin/env node
// Offline regression fixtures: no Neon credentials or network access required.
const assert=require('node:assert/strict');
const colaToken=/(^|[^\p{L}])(cola|pepsi)(?=[^\p{L}]|$)/iu;
const context=/(virvoitusjuoma|virvoitujuoma|soda|original taste|zero sugar)/iu;
const excluded=/(jauhe|karkki|makeinen|energiajuoma)/iu;
const isCola=s=>colaToken.test(s)&&context.test(s)&&!excluded.test(s);
const cases=[
['Pirkka Cola sokeriton virvoitusjuoma 1,5l',true],
['Pepsi Max virvoitusjuoma 0,33l',true],
['Coca-Cola Original Taste 330 ml',true],
['Gosh Tangerine Pear Cola Soda Pop virvoitusjuoma',true],
['Fanta Banana Chocolate virvoitusjuoma 0,5l',false],
['Puls Energy BCAA+ aminohappojuomajauhe Cola 300g',false],
['Rimbies Tangy Cola & Berry Blast 80g',false],
['Colanmakuinen karkki',false],
['Pepsi energiajuoma',false],
['Kaurajuoma Fazer Aito Barista 1l',false],
['Proteiinijuoma Maxim Chocolate',false]
];
const results=cases.map(([name,expected])=>({name,expected,actual:isCola(name),pass:isCola(name)===expected}));
const report={total:results.length,passed:results.filter(x=>x.pass).length,results};
console.log(JSON.stringify(report,null,2));
assert.equal(report.passed,report.total,'Cola classification fixture regression failed');
