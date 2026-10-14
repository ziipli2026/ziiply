const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const slots = [];
let cursor = 0;
const effects = [];
const requests = [];
const fixture = process.argv[2]
  ? JSON.parse(fs.readFileSync(process.argv[2])).stations
  : [
      {
        id: "1",
        chain: "Neste",
        name: "Neste liikenneasema",
        isTrafficStation: true,
        diesel: 2.111,
        price95: 2.222,
        price98: 2.333,
      },
      {
        id: "2",
        chain: "ABC",
        name: "ABC liikenneasema",
        isTrafficStation: true,
        diesel: null,
        price95: null,
        price98: null,
      },
      {
        id: "3",
        chain: "Neste",
        name: "Neste automaatti",
        isTrafficStation: false,
        diesel: 2.123,
        price95: 2.234,
        price98: 2.345,
      },
      {
        id: "4",
        chain: "Neste",
        name: "Neste toinen automaatti",
        isTrafficStation: false,
        diesel: null,
        price95: null,
        price98: null,
      },
      {
        id: "5",
        chain: "ABC",
        name: "ABC automaatti",
        isTrafficStation: false,
        diesel: 2.111,
        price95: 2.222,
        price98: 2.333,
      },
    ].map((s) => ({
      ...s,
      distanceKm: Number(s.id),
      address: "Testikatu",
      observedDiesel: null,
      observed95: null,
      observed98: null,
    }));
const hooks = {
  ...React,
  useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial;
    return [
      slots[i],
      (value) => {
        slots[i] = typeof value === "function" ? value(slots[i]) : value;
      },
    ];
  },
  useMemo(fn) {
    return fn();
  },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!slots[i] || deps.some((v, j) => v !== slots[i][j])) {
      slots[i] = deps;
      effects.push(fn);
    }
  },
};
function Selector() {
  return null;
}
const source = fs.readFileSync(
  path.join(
    __dirname,
    "../src/app/components/ziiply/mobile/ZiiplyMobileFuelView.tsx",
  ),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(js, {
  exports: moduleObject.exports,
  module: moduleObject,
  require(name) {
    if (name === "react") return hooks;
    if (name.includes("ZiiplyMobileStoreModeSelector"))
      return { default: Selector };
    return require(name);
  },
  AbortController,
  window: { addEventListener() {}, removeEventListener() {} },
  fetch: async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({ ok: true, stations: fixture }) };
  },
  console,
});
let back = false;
let props = {
  coords: { lat: 60.4939, lon: 25.5414 },
  onBack: () => {
    back = true;
  },
};
function render() {
  cursor = 0;
  const tree = moduleObject.exports.default(props);
  while (effects.length) effects.shift()();
  return tree;
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function selector(tree) {
  return nodes(tree).find((n) => n.type === Selector).props;
}
function articles(tree) {
  return nodes(tree).filter((n) => n.type === "article");
}
function buttons(tree) {
  return nodes(tree).filter((n) => n.type === "button");
}
function choices(tree) {
  return buttons(tree).filter(
    (n) => "aria-pressed" in n.props && !n.props.disabled,
  );
}
function text(tree) {
  return nodes(tree)
    .flatMap((n) =>
      React.Children.toArray(n.props?.children).filter(
        (c) => typeof c === "string" || typeof c === "number",
      ),
    )
    .join(" ");
}
(async () => {
  let tree = render();
  await new Promise((resolve) => setImmediate(resolve));
  tree = render();
  assert.equal(requests.length, 1);
  assert.match(requests[0], /lat=60\.4939&lon=25\.5414/);
  assert.equal(articles(tree).length, 5);
  let available = choices(tree);
  assert(available.length >= 2);
  available[0].props.onClick();
  tree = render();
  choices(tree)[1].props.onClick();
  tree = render();
  assert.equal(
    choices(tree).filter((n) => n.props["aria-pressed"]).length,
    1,
    "Yksi replaces previous selection",
  );
  selector(tree).onBetweenChainSelectionModeChange("many");
  tree = render();
  choices(tree)[0].props.onClick();
  tree = render();
  assert.equal(
    choices(tree).filter((n) => n.props["aria-pressed"]).length,
    2,
    "Monta keeps both selections",
  );
  selector(tree).onStoreModeChange("local");
  tree = render();
  assert.equal(selector(tree).selectedRealChainCount, 0);
  const names = choices(tree).map((n) => n.props["aria-label"]);
  assert(
    names.every(
      (name) =>
        !fixture.some((s) => s.isTrafficStation && name.endsWith(s.name)),
    ),
  );
  const swap = buttons(tree).find(
    (n) => n.props["aria-label"] === "Vaihda Neste asemaa",
  );
  swap.props.onClick();
  tree = render();
  assert(nodes(tree).some((n) => n.props?.role === "dialog"));
  const candidate = buttons(
    nodes(tree).find((n) => n.props?.role === "dialog"),
  ).find((n) =>
    text(n).includes(
      fixture.find((s) => !s.isTrafficStation && /neste/i.test(s.chain)).name,
    ),
  );
  candidate.props.onClick();
  tree = render();
  assert(!nodes(tree).some((n) => n.props?.role === "dialog"));
  selector(tree).onStoreCompareScopeChange("within_chain");
  tree = render();
  choices(tree)[0].props.onClick();
  tree = render();
  assert(
    choices(tree).every((n) => n.props["aria-label"].startsWith("Neste:")),
    "Within-chain renders stations of one chain",
  );
  if (!process.argv[2])
    assert.match(
      text(tree).replace(/\s+/g, " "),
      /D – · 95 – · 98 –/,
      "Missing prices remain missing",
    );
  buttons(tree)
    .find((n) => n.props.children === "← Kaupat")
    .props.onClick();
  assert(back);
  props = { ...props, coords: { lat: 61, lon: 26 } };
  render();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 2);
  assert.match(requests[1], /lat=61&lon=26/);
  assert(
    requests.every((url) => url.startsWith("/api/fuel/stations?")),
    "Viewing never submits price reports",
  );
  console.log(
    `Fuel mobile view simulations passed (${fixture.length} stations)`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
