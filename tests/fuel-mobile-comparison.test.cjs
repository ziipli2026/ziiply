const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

const root = path.join(__dirname, "../src/app/components/ziiply");
const fixtures = [
  { id: "n-far", chain: "Neste", name: "Neste farther", distanceKm: 12, diesel: 1.8, price95: 1.7, isTrafficStation: true },
  { id: "n-near", chain: "Neste", name: "Neste nearer", distanceKm: 2, diesel: 1.8, price95: 1.9, isTrafficStation: true },
  { id: "n-cold", chain: "Neste", name: "Neste cold", distanceKm: 1, diesel: 1.5, price95: 1.6, isTrafficStation: false },
  { id: "n-missing", chain: "Neste", name: "Neste missing", distanceKm: 3, diesel: null, price95: null, isTrafficStation: true },
  { id: "abc", chain: "ABC", name: "ABC cheapest", distanceKm: 4, diesel: 1.1, price95: 1.2, isTrafficStation: true },
].map(station => ({ address: "Testikatu", price98: null, observedDiesel: null, observed95: null, observed98: null, ...station }));
let cursor = 0;
const slots = [];
let effects = [];
let readiness = false;
let closed = false;
const hooks = {
  ...React,
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = index === 0 ? fixtures : index === 1 ? false : initial;
    return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  },
  useMemo: fn => fn(),
  useEffect(fn, deps) {
    // Skip only the network effect: loaded fixture data is supplied above.
    if (deps.some(value => typeof value === "function") || deps.some(value => typeof value === "boolean")) effects.push(fn);
  },
};
function Selector() {}
function Backdrop() {}
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, "utf8");
  const result = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
  assert.equal(result.diagnostics.length, 0);
  const moduleObject = { exports: {} };
  vm.runInNewContext(result.outputText, {
    module: moduleObject, exports: moduleObject.exports,
    require(name) {
      if (name === "react") return hooks;
      if (name.endsWith("ZiiplyMobileStoreModeSelector")) return { default: Selector };
      if (name.endsWith("FuelStationBackdrop")) return { default: Backdrop };
      if (name === "./fuelComparison") return load("mobile/fuelComparison.ts");
      return require(name);
    },
  });
  cache.set(relative, moduleObject.exports);
  return moduleObject.exports;
}
const fuel = load("mobile/ZiiplyMobileFuelView.tsx").default;
const props = { coords: { lat: 60, lon: 25 }, onBack() {}, onComparisonReadyChange: value => { readiness = value; }, onCloseComparison: () => { closed = true; } };
const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = tree => nodes(tree).flatMap(node => React.Children.toArray(node.props?.children).filter(value => typeof value === "string" || typeof value === "number")).join(" ");
const button = (tree, label) => nodes(tree).find(node => node.type === "button" && (node.props["aria-label"] === label || text(node) === label));
function render(comparisonOpen = false) {
  cursor = 0;
  effects = [];
  const tree = fuel({ ...props, comparisonOpen });
  effects.forEach(effect => effect());
  return tree;
}
let tree = render();
assert.equal(readiness, false);
button(tree, "Valitse Neste").props.onClick();
tree = render();
assert.equal(readiness, true);
nodes(tree).find(node => node.type === Selector).props.onFuelStationSideChange("traffic");
tree = render(true);
const names = tree => nodes(tree).filter(node => node.type === "h3").map(text);
assert.equal(names(tree).join(","), "Neste nearer,Neste missing,Neste farther");
assert(!text(tree).includes("ABC cheapest"));
assert(!text(tree).includes("Neste cold"));
button(tree, "Halvin diesel").props.onClick();
tree = render(true);
assert.equal(names(tree).join(","), "Neste nearer,Neste farther,Neste missing", "Price ties use distance; absent prices last");
button(tree, "Halvin bensa 95").props.onClick();
tree = render(true);
assert.equal(names(tree).join(","), "Neste farther,Neste nearer,Neste missing");
assert(!text(tree).includes("NaN"));
assert(!text(tree).includes("0,000"));
button(tree, "Takaisin asemavalintaan").props.onClick();
assert(closed);
tree = render();
assert.equal(button(tree, "Valitse Neste").props["aria-pressed"], true);
assert.equal(nodes(tree).find(node => node.type === Selector).props.fuelStationSide, "traffic");

const { ZiiplyBottomNav } = load("ziiplyComponents.tsx");
const baseNav = { shopsPanelOpen: true, initialStoreNavPrompt: false, searchBottomNavDisabled: true, initialStoreSelectionLocked: true, searchPanelOpen: false, searchReadyBounceKeyV320: 0, storesReadyForSearch: false, cartLength: 0, cartModalOpen: false, activeResult: "none", onShopsClick() {}, onSearchClick() {}, onCartClick() {}, onCompareClick() {} };
const nav = (fuelMode, ready) => ZiiplyBottomNav({ ...baseNav, fuelMode, fuelCompareReady: ready });
assert.equal(button(nav(true, false), "Gösta vertailee polttoainehinnat").props.disabled, true);
assert.equal(button(nav(true, true), "Gösta vertailee polttoainehinnat").props.disabled, false, "Fuel comparison does not depend on grocery selections");
assert.equal(button(nav(false, true), "Hae").props.disabled, true, "Grocery gating is unchanged");
console.log("Fuel comparison passed: selected chains/types, distance/price ordering, missing prices, return preserves selection, independent fuel/grocery navigation gating.");
