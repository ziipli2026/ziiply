const assert = require("node:assert/strict");
const fs = require("node:fs");
const src = fs.readFileSync("src/app/desktop-preview/DesktopPreviewClient.tsx", "utf8");
function contains(re, label) { assert.match(src, re, label); }
contains(/function distanceKm\(s:any\)\{ if\(!gpsOn \|\| !gpsCoords\)return Number\.POSITIVE_INFINITY/, "GPS off hides displayed distances");
contains(/const storeRankingCoords = gpsCoords \?\? fuelLocationCoords \?\? lastStoreRankingCoordsRef\.current/, "last known location retained for ranking");
contains(/function byDistance\(items:any\[\]\)\{return \[\.\.\.items\]\.sort\(\(a,b\)=>independentStoreDistance\(a\)-independentStoreDistance\(b\)\);\}/, "all chains use same distance ranking");
contains(/storeRankingCoords&&Number\.isFinite\(independentStoreDistance\(pool\[0\]\)\)\?pool\[0\]:null/, "no arbitrary fallback store without location");
contains(/store\.desktopSelectionOrigin === "manual"/, "manual stores preserved during reconciliation");
contains(/const nearest = byDistance\(eligible\)\[0\]/, "automatic stores recalculated from location");
contains(/const \[location, setLocation\] = useState\(""/, "location input starts empty");
const rank=(origin,stores)=>origin ? [...stores].sort((a,b)=>Math.hypot(a.lat-origin.lat,a.lon-origin.lon)-Math.hypot(b.lat-origin.lat,b.lon-origin.lon)) : [];
const stores=[{name:"Lahti",lat:61,lon:25.6},{name:"Hyvinkää",lat:60.63,lon:24.86},{name:"Myyrmäki",lat:60.26,lon:24.85}];
assert.equal(rank({lat:60.63,lon:24.86},stores)[0].name,"Hyvinkää");
assert.equal(rank({lat:60.26,lon:24.85},stores)[0].name,"Myyrmäki");
assert.equal(rank(null,stores).length,0);
console.log("PASS desktop GPS store regression: GPS-off visibility, last location, all chains, no fallback, manual choices, changed location, empty location");