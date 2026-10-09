import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCartRestore,restoreActiveCart,RESTORE_BACKUP_KEY} from '../../src/lib/account/restore.ts';
const item={id:'abc',name:'Maito',quantity:2,price:4.99,product:{price:4.99},ziiplyPriceFetchedAt:123};
const snapshot={version:1,values:{'ziiply-cart-v1':{version:2,items:[item]}}};
function storage(initial={}){const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('mobile cloud cart converts to desktop without old prices or lost quantities',()=>{
 const {items,serialized}=prepareCartRestore(snapshot,'mobile','desktop');
 assert.equal(items[0].quantity,2);assert.equal(items[0].price,null);assert.equal(items[0].product.price,0);assert.equal(JSON.parse(serialized)[0].name,'Maito');assert.equal(item.price,4.99);
});
test('desktop title converts to native mobile format',()=>{
 const result=prepareCartRestore({version:1,values:{'ziiply-desktop-current-cart-v1':[{id:'weight-1',title:'Juusto',quantity:1,ziiplyWeightLabel:true,price:9.99}]}},'desktop','mobile');
 const data=JSON.parse(result.serialized);assert.equal(data.version,2);assert.equal(data.items[0].name,'Juusto');assert.equal(data.items[0].price,0);assert.equal(data.items[0].ziiplyPriceRefreshPending,false);
});
test('missing source, malformed items and quantities fail before storage writes',()=>{
 assert.throws(()=>prepareCartRestore(snapshot,'desktop','mobile'));
 for(const change of [{id:''},{quantity:-1},{quantity:'2'},{name:null}])assert.throws(()=>prepareCartRestore({version:1,values:{'ziiply-cart-v1':[{...item,...change}]}},'mobile','mobile'));
});
test('explicit restore backs up old cart, clears stale comparison and checks; saved lists stay',()=>{
 const store=storage({'ziiply-cart-v1':'old','ziiply-comparison-snapshot-v1':'prices','ziiply-shopping-checks-v1':'checks','ziiply-saved-shopping-lists-v1':'lists'});
 restoreActiveCart(store,'mobile','new','old');assert.equal(store.getItem('ziiply-cart-v1'),'new');assert.equal(store.getItem('ziiply-comparison-snapshot-v1'),null);assert.equal(store.getItem('ziiply-saved-shopping-lists-v1'),'lists');assert.equal(JSON.parse(store.getItem(RESTORE_BACKUP_KEY)).previous['ziiply-cart-v1'],'old');
});
test('local edits after preview and failed backup never overwrite active cart',()=>{
 const store=storage({'ziiply-cart-v1':'changed'});assert.throws(()=>restoreActiveCart(store,'mobile','new','old'));assert.equal(store.getItem('ziiply-cart-v1'),'changed');
 const blocked={...store,setItem(){throw new Error('quota')}};assert.throws(()=>restoreActiveCart(blocked,'mobile','new','changed'));assert.equal(store.getItem('ziiply-cart-v1'),'changed');
});
test('failed cart write rolls back cleared metadata',()=>{
 const store=storage({'ziiply-cart-v1':'old','ziiply-comparison-snapshot-v1':'prices'});
 const failing={...store,setItem(k,v){if(v==='new')throw new Error('quota');store.setItem(k,v)}};
 assert.throws(()=>restoreActiveCart(failing,'mobile','new','old'));assert.equal(store.getItem('ziiply-cart-v1'),'old');assert.equal(store.getItem('ziiply-comparison-snapshot-v1'),'prices');
});
test('desktop carts exceeding native mobile limit cannot be silently truncated',()=>{
 assert.throws(()=>prepareCartRestore({version:1,values:{'ziiply-desktop-current-cart-v1':Array.from({length:9},(_,i)=>({...item,id:String(i)}))}},'desktop','mobile'),/8 tuotetta/);
});
test('desktop handwritten memo receives stable mobile identifier',()=>{
 const result=prepareCartRestore({version:1,values:{'ziiply-desktop-current-cart-v1':[{title:'Omenat',source:'justiina',quantity:1}]}},'desktop','mobile');
 assert.equal(result.items[0].id,'memo:omenat');assert.equal(result.items[0].name,'Omenat');
});
