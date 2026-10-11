#!/usr/bin/env node
// Syntax-only transpilation: does not resolve imports or type-check the full Next.js app.
const fs=require("node:fs");
const ts=require("typescript");
const paths=[
 "src/lib/ruoanhintaPagination.ts",
 "src/app/api/s-products/route.ts",
 "src/app/api/k-products/route.ts"
];
const results=paths.map(path=>{
 const source=fs.readFileSync(path,"utf8");
 const result=ts.transpileModule(source,{fileName:path,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
 const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  .map(d=>ts.flattenDiagnosticMessageText(d.messageText," "));
 return {path,pass:errors.length===0,errors};
});
console.log(JSON.stringify({kind:"search-route-syntax",fullTypecheck:false,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
