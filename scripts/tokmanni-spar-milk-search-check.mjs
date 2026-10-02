#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const js=ts.transpileModule(readFileSync("src/lib/sparMilkSearch.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(js,{exports});
const names=["Valio kevytmaito 1 l","Laktoositon maito 1 l","Kauramaito 1 l","Maitojauhe","Kondensoitu maito","Kasvomaito","Maitotuttipullo","Puhdistusmaito","Maitosuklaa","Vartalomaito","Täysmaito","Soijamaito"];
const items=names.map(name=>({name}));
const result=exports.filterSparMilkQuery(items,"maito").map(x=>x.name);
assert.deepEqual(Array.from(result),names.slice(0,5).concat(["Täysmaito","Soijamaito"]));
assert.equal(exports.filterSparMilkQuery(items,"suklaa").length,items.length);
console.log("PASS: maito relevance excludes cosmetic/bottle false positives, preserves milk foods and other queries");
