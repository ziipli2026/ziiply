import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync("scripts/citymarket/discover-image-metadata.mjs","utf8");
assert.ok(source.includes(String.raw`/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi`),"JSON-LD script matcher must use actual regex escapes");
assert.ok(source.includes('JSON.parse(match[2])'),"Script body must be read from capture group two");
const attr=(tag,name)=>{const m=tag.match(new RegExp("\\b"+name+"\\s*=\\s*([\\\"'])(.*?)\\1","i"));return m?.[2]??null};
const matcher=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const samples=[
  '<script type="application/ld+json">{"@type":"Product","image":"https://example.org/a.jpg"}</script>',
  '<script id="data" type="application/ld+json" nonce="abc">{"@type":"Product","image":"https://example.org/b.jpg"}</script>',
  '<script type="application/ld+json; charset=utf-8">{"@type":"Product","image":"https://example.org/c.jpg"}</script>',
  '<script type="text/javascript">{"@type":"Product","image":"https://example.org/not-product.jpg"}</script>'
];
const found=[];
for(const match of samples.join("\n").matchAll(matcher)){
  if(!/^(?:application\/ld\+json)(?:\s*;.*)?$/i.test(attr(match[1],"type")??""))continue;
  found.push(JSON.parse(match[2]).image);
}
assert.deepEqual(found,["https://example.org/a.jpg","https://example.org/b.jpg","https://example.org/c.jpg"]);
const nested = {"@type":"WebPage","mainEntity":{"@type":"ItemList","itemListElement":[{"@type":"ListItem","item":{"@type":"Product","image":"https://example.org/nested-packshot.jpg"}}]}};
const foundNested=[];
const walk=node=>{
  if(!node||typeof node!=="object")return;
  if(Array.isArray(node)){node.forEach(walk);return;}
  if([].concat(node["@type"]??[]).map(String).some(type=>type.toLowerCase()==="product")){
    for(const item of [].concat(node.image??[]))if(typeof item==="string")foundNested.push(item);
  }
  for(const key of ["@graph","mainEntity","mainEntityOfPage","hasPart","itemListElement","item"]){if(node[key])walk(node[key]);}
};
walk(nested);
assert.deepEqual(foundNested,["https://example.org/nested-packshot.jpg"]);
console.log("JSON-LD script and nested Product regression passed.");
