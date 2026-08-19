const assert=require('node:assert/strict');
const {indexedDB}=require('fake-indexeddb');
class LocalStorageMock{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
global.indexedDB=indexedDB;
global.localStorage=new LocalStorageMock();
global.location={pathname:'/tests/',href:'https://pos.example.test/tests/'};
global.document={getElementById(){return null},addEventListener(){},visibilityState:'visible'};
global.addEventListener=()=>{};
global.KCStorageVault={
  ready:Promise.resolve(true),
  protectedKey(key){return String(key||'').startsWith('kc_')},
  async sealJson(value,aad=''){return {format:'TEST_AES_GCM',aad,data:Buffer.from(JSON.stringify(value)).toString('base64')}},
  async openJson(wrapper,aad=''){assert.equal(wrapper.aad,aad);return JSON.parse(Buffer.from(wrapper.data,'base64').toString('utf8'))},
  async setItemDurable(key,value){localStorage.setItem(key,value);return true}
};
localStorage.setItem('kc_gateway_device_id_v1','DEVICE-TEST');
localStorage.setItem('kc_gateway_device_secret_v1','0123456789abcdef0123456789abcdef0123456789abcdef');
const api=require('../cores/notification-core/notification-core.js');
const sync=api.FailoverSync;
const remote=new Map();
let batches=0,forceConflict=null,signedRequests=0;
function assertSigned(options){const h=new Headers(options.headers||{});assert.equal(h.get('x-kc-device'),'DEVICE-TEST');assert.match(h.get('x-kc-timestamp')||'',/^\d+$/);assert.ok((h.get('x-kc-nonce')||'').length>=16);assert.match(h.get('x-kc-signature')||'',/^[0-9a-f]{64}$/);assert.equal(h.get('x-kc-client'),'KC-POS');signedRequests++}
global.fetch=async(url,options={})=>{
  const u=String(url);if(u.includes('/sync/'))assertSigned(options);
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
  let s=await sync.status();assert.equal(s.pending,2);assert.equal(s.encryption,'AES-256-GCM');assert.equal(s.gatewayAuth,'HMAC-SHA-256');assert.equal(s.authProvisioned,true);
  await sync.syncNow();s=await sync.status();assert.equal(s.pending,0);assert.equal(s.acked,2);assert.equal(remote.size,2);assert.equal(batches,1);
  await sync.syncNow();assert.equal(remote.size,2);assert.equal(batches,1,'replay must not duplicate or resend acked rows');
  remote.delete('T2');
  const r=await sync.reconcile();assert.deepEqual(r.missingRemote,['T2']);s=await sync.status();assert.equal(s.pending,1);
  await sync.syncNow();assert.equal(remote.has('T2'),true);s=await sync.status();assert.equal(s.pending,0);
  const rows=JSON.parse(localStorage.getItem('kc_transactions_v040'));rows.push(tx('T3'));localStorage.setItem('kc_transactions_v040',JSON.stringify(rows));forceConflict='T3';await sync.syncNow();s=await sync.status();assert.equal(s.pending,1);assert.equal(s.conflicts,1);assert.equal(remote.has('T3'),false);
  forceConflict=null;
  const st=await sync.selfTest();assert.equal(st.queuePersist,true);assert.equal(st.queueEncrypted,true);assert.equal(st.authProvisioned,true);assert.ok(signedRequests>=5);
  console.log(JSON.stringify({status:'PASS',offlineQueue:true,encryptedQueue:true,gatewayHmac:true,replayIdempotent:true,reconcileRepair:true,conflictRetention:true,selfTest:st,signedRequests,batches,remote:remote.size}));
})().catch(e=>{console.error(e);process.exit(1)});
