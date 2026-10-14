require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const componentPath=require.resolve('../src/app/components/ziiply/cards/ZiiplyMobileSearchResultsCard.tsx');
const componentModule=new Module(componentPath,module);componentModule.filename=componentPath;componentModule.paths=module.paths;
componentModule._compile(ts.transpileModule(fs.readFileSync(componentPath,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,componentPath);
const Card=componentModule.exports.default;
const {productMoneyEuros}=require('../src/app/components/ziiply/productMoney.ts');
for(const [value,unit,expected] of [[85,'cent',0.85],[0.85,'eur',0.85],[2500,'cent',25],[25,'eur',25],['18,42 €','cent',18.42],[null,'eur',null],['bad','cent',null],[-1,'eur',null]])assert.equal(productMoneyEuros(value,unit),expected);
// Render real K/S result cards: sub-euro cents and genuine larger packages.
for (const [price, expected] of [[85,'0,85'],[89,'0,89'],[99,'0,99'],[119,'1,19'],[1849,'18,49']]) {
  for (const provenance of [{brandName:'Lada'},{priceAmountUnit:'cent'},{storeItems:[{price}]}]) {
    const html=renderToStaticMarkup(React.createElement(Card,{open:true,products:[{name:'Pirkka maustepippuri 13g',price,...provenance}]}));
    assert.ok(html.includes(expected+' €'),'source cents render correctly: '+JSON.stringify({price,provenance}));
  }
}
const euroHtml=renderToStaticMarkup(React.createElement(Card,{open:true,products:[{name:'Tuote',price:25,priceAmountUnit:'eur',chain:'Any manufacturer'}]}));
assert.ok(euroHtml.includes('25,00 €'),'euro source stays in euros');
const item={id:1,name:'Meira maustepippuri kokonainen 20g',price:135};
const ready=renderToStaticMarkup(React.createElement(Card,{open:true,products:[item],loading:false,onAddProduct:()=>{},onSkip:()=>{}}));
const loading=renderToStaticMarkup(React.createElement(Card,{open:true,products:[item],loading:true,onAddProduct:()=>{},onSkip:()=>{}}));
assert.ok(ready.includes(item.name)&&loading.includes(item.name),'old product list stays mounted while next query loads');
assert.ok(loading.includes('aria-busy="true"'));assert.ok(/<button[^>]*disabled/.test(loading),'stale product choices disabled');
assert.ok(ready.includes('Ohita tuote →'));assert.ok(/<button[^>]*disabled[^>]*>Ohita tuote →<\/button>/.test(loading),'compact skip stays mounted while loading');
assert.ok(/role="status"[^>]*class="absolute inset-0/.test(loading),'loading status uses existing header space');
assert.ok(/<header[\s\S]*>Ohita tuote →<\/button>[\s\S]*<\/header>/.test(ready),'skip stays in fixed header outside product scroller');
assert.ok(!ready.includes('top-[55%]'),'skip never floats over products');
const initial=renderToStaticMarkup(React.createElement(Card,{open:true,products:[],loading:true}));
const empty=renderToStaticMarkup(React.createElement(Card,{open:true,products:[],loading:false,onSkip:()=>{},title:'silakkafilee',emptyText:'Tälle ainekselle ei löytynyt tuotetta'}));
for(const html of [ready,loading,initial,empty])assert.ok(html.includes('LÖYTÖLUETTELO')&&html.includes('<section'),'one stable list frame for every phase');
assert.ok(empty.includes('silakkafilee</strong>: sopivaa tuotetta') && !empty.includes('Tälle ainekselle'),'missing notice names ingredient');
assert.equal((empty.match(/Ohita tuote →/g)||[]).length,1,'empty state only has one skip action');
assert.ok(!/<header[\s\S]*Ohita tuote[\s\S]*<\/header>/.test(empty),'missing-product skip is inside notice only');
assert.ok(empty.includes('mx-auto mt-4 block min-h-11') && empty.includes('text-lg'),'notice action is centered and larger');
const page=fs.readFileSync('src/app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let wait,open;
function visit(n){
 if(ts.isFunctionDeclaration(n)&&n.name?.text==='waitForVoiceSearchResultChoiceV509')wait=n;
 if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='ZiiplyMobileSearchResultsCard')open=n.attributes.properties.find(p=>p.name?.getText(ast)==='open').initializer.expression;
 ts.forEachChild(n,visit);
}visit(ast);
const expression=open.getText(ast);
assert.equal(new Function('searchPanelOpen','mobileRecipeSearchActive','loadingNormal','normalResults','mobileResultsReadyQueryV537','return ('+expression+');')(true,true,true,[],''),true,'initial loading never closes list shell');
const code=ts.transpileModule(wait.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const resolver={current:null};
const fn=new Function('pushVoiceDebugV507','voiceResultWaitResolverRefV509','mobileResultsReadyQueryRefV509','normalResultsLatestRefV441','window',code+';return waitForVoiceSearchResultChoiceV509;')(()=>{},resolver,{current:''},{current:[]},{setTimeout:()=>{throw new Error('Recipe must not silently time out or skip missing fish')}});
(async()=>{let finished=false;const pending=fn('silakkafilee',true).then(()=>{finished=true});await new Promise(setImmediate);assert.equal(finished,false,'missing ingredient requires explicit user skip');assert.equal(typeof resolver.current,'function');resolver.current();await pending;console.log('PASS: real result card retains product rows, disables old choices, shares one frame for loading/empty/results; missing fish waits for explicit skip')})().catch(error=>{console.error(error);process.exitCode=1});
