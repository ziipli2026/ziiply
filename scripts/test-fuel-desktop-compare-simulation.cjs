const assert=require("node:assert/strict");

const stations=[
 {id:1,chain:"ABC",name:"ABC Hyvinkää 1",distanceKm:0.8,prices:{diesel:2.51,"95e10":1.92,"98e5":2.01}},
 {id:2,chain:"ABC",name:"ABC Hyvinkää 2",distanceKm:1.4,prices:{diesel:2.54,"95e10":1.94,"98e5":2.03}},
 {id:3,chain:"ABC",name:"ABC Hyvinkää 3",distanceKm:2.1,prices:{diesel:2.56,"95e10":1.95,"98e5":2.04}},
 {id:4,chain:"ABC",name:"ABC Hyvinkää 4",distanceKm:3.0,prices:{diesel:2.58,"95e10":1.96,"98e5":2.05}},
 {id:5,chain:"ABC",name:"ABC Hyvinkää 5",distanceKm:4.2,prices:{diesel:2.61,"95e10":1.97,"98e5":2.07}},
 {id:6,chain:"ABC",name:"ABC Hyvinkää 6",distanceKm:5.1,prices:{diesel:2.64,"95e10":1.99,"98e5":2.09}},
 {id:7,chain:"Neste",name:"Neste Hyvinkää",distanceKm:1.1,prices:{diesel:2.52,"95e10":1.93,"98e5":2.02}},
 {id:8,chain:"Neste",name:"Neste Riihimäki",distanceKm:9.4,prices:{diesel:2.57,"95e10":1.98,"98e5":2.08}},
 {id:9,chain:"St1",name:"St1 Hyvinkää",distanceKm:2.8,prices:{diesel:2.55,"95e10":1.96,"98e5":2.06}},
 {id:10,chain:"St1",name:"St1 Riihimäki",distanceKm:8.8,prices:{diesel:2.59,"95e10":1.99,"98e5":2.09}},
];

const latest=stations.slice().sort((a,b)=>a.distanceKm-b.distanceKm);
const cap=a=>a.slice(0,5);
const betweenChains=(selectedChains)=>selectedChains.map(c=>({chain:c,stations:cap(latest.filter(s=>s.chain===c))}));
const withinChain=c=>cap(latest.filter(s=>s.chain===c));

const between=betweenChains(["ABC","Neste","St1"]);
assert.equal(between.length,3);
assert.deepEqual(between.map(x=>x.stations.length),[5,2,2]);
assert.equal(between[0].stations[0].distanceKm,0.8);
assert.equal(between[0].stations.at(-1).distanceKm,4.2);

const within=withinChain("ABC");
assert.equal(within.length,5);
assert.deepEqual(within.map(s=>s.id),[1,2,3,4,5]);

const rows=stations[0].prices;
assert.equal(rows.diesel,2.51);
assert.equal(rows["95e10"],1.92);
assert.equal(rows["98e5"],2.01);

const timestamps={diesel:"2026-10-08T06:10:00+03:00","95e10":"2026-10-08T06:11:00+03:00","98e5":"2026-10-08T06:12:00+03:00"};
assert.deepEqual(Object.keys(timestamps),["diesel","95e10","98e5"]);

const twentyFive=Array.from({length:25},(_,i)=>({...stations[i%stations.length],id:100+i,name:"Station "+(i+1),distanceKm:i+0.1}));
assert.equal(twentyFive.length,25);
assert.equal(cap(twentyFive).length,5);

console.log("PASS fuel desktop compare simulation");
console.log(JSON.stringify({
 betweenChains:between.map(x=>({chain:x.chain,count:x.stations.length,distances:x.stations.map(s=>s.distanceKm)})),
 withinChain:{chain:"ABC",count:within.length,distances:within.map(s=>s.distanceKm)},
 fuelRows:rows,
 twentyFive:{input:25,visible:cap(twentyFive).length}
},null,2));
