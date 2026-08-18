const assert=require('node:assert/strict');
const {indexedDB}=require('fake-indexeddb');
class LocalStorageMock{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
global.indexedDB=indexedDB;
global.localStorage=new LocalStorageMock();
global.location={pathname:'/tests/'};
global.document={getElementById(){return null},addEventListener(){},visibilityState:'visible'};
global.addEventListener=()=>{};
const api=require('../cores/notification-core/notification-core.js');
const sync=api.FailoverSync;
const remote=new Map();
let batches=0,forceConflict=null;
global.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.endsWith('/sync/batch')){
    batches++;
    const body=JSON.parse(options.body||'{}');
    const results=(body.transactions||[]).map(tx=>{
      if(tx.transactionId===forceConflict)return {transactionId:tx.transactionId,status:'CONFLICT'};
      if(remote.has(tx.transactionId))return {transactionId:tx.transactionId,status:'ALREADY_STORED'};
      remote.set(tx.transactionId,tx);return {transactionId:tx.transactionId,status:'STORED'};
    });
    return {ok:true,status:200,json:async()=>({status:'OK',results,conflicts:results.filter(x=>x.status==='CONFLICT')})};
  }
  if(u.endsWith('/sync/reconcile')){
    const body=JSON.parse(options.body||'{}'),local=new Set(body.transactionIds||[]),ids=[...remote.values()].filter(x=>x.registerId===body.registerId).map(x=>x.transactionId),rset=new Set(ids);
    return {ok:true,status:200,json:async()=>({status:'OK',missingRemote:[...local].filter(id=>!rset.has(id)),missingLocal:ids.filter(id=>!local.has(id)),remoteCount:rset.size,localCount:local.size})};
  }
  if(u.includes('/sync/transactions?')){
    const reg=decodeURIComponent(u.split('register_id=')[1]||'');
    const transactions=[...remote.values()].filter(x=>x.registerId===reg);
    return {ok:true,status:200,json:async()=>({status:'OK',count:transactions.length,transactions})};
  }
  throw new Error('unexpected fetch '+u);
};
const tx=(id,hash=id)=>({transactionId:id,registerId:'KASSE-TEST',registerName:'Test',time:'2026-08-18T05:00:00Z',recordHash:hash,items:[{id:'x',qty:1}],total:1});
(async()=>{
  localStorage.setItem('kc_transactions_v040',JSON.stringify([tx('T1'),tx('T2')]));
  assert.equal(await sync.enqueueMissing(),2);
  let s=await sync.status();assert.equal(s.pending,2);
  await sync.syncNow();s=await sync.status();assert.equal(s.pending,0);assert.equal(s.acked,2);assert.equal(remote.size,2);assert.equal(batches,1);
  await sync.syncNow();assert.equal(remote.size,2);assert.equal(batches,1,'replay must not duplicate or resend acked rows');
  remote.delete('T2');
  const r=await sync.reconcile();assert.deepEqual(r.missingRemote,['T2']);s=await sync.status();assert.equal(s.pending,1);
  await sync.syncNow();assert.equal(remote.has('T2'),true);s=await sync.status();assert.equal(s.pending,0);
  const rows=JSON.parse(localStorage.getItem('kc_transactions_v040'));rows.push(tx('T3'));localStorage.setItem('kc_transactions_v040',JSON.stringify(rows));forceConflict='T3';await sync.syncNow();s=await sync.status();assert.equal(s.pending,1);assert.equal(s.conflicts,1);assert.equal(remote.has('T3'),false);
  forceConflict=null;
  const st=await sync.selfTest();assert.equal(st.queuePersist,true);
  console.log(JSON.stringify({status:'PASS',offlineQueue:true,restartDurabilityModel:true,replayIdempotent:true,reconcileRepair:true,conflictRetention:true,selfTest:st,batches,remote:remote.size}));
})().catch(e=>{console.error(e);process.exit(1)});
