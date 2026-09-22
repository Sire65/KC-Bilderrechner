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
const integrity=require('../cores/transaction-integrity-core/transaction-integrity-core.js');
global.KCTransactionIntegrity=integrity;
localStorage.setItem('kc_gateway_device_id_v1','DEVICE-TEST');
localStorage.setItem('kc_gateway_device_secret_v1','0123456789abcdef0123456789abcdef0123456789abcdef');
const api=require('../cores/notification-core/notification-core.js');
const sync=api.FailoverSync;
const remote=new Map();
let batches=0,forceConflict=null,signedRequests=0,idPageRequests=0,txPageRequests=0;
const reconcileBatchSizes=[];
function assertSigned(options){const h=new Headers(options.headers||{});assert.equal(h.get('x-kc-device'),'DEVICE-TEST');assert.match(h.get('x-kc-timestamp')||'',/^\d+$/);assert.ok((h.get('x-kc-nonce')||'').length>=16);assert.match(h.get('x-kc-signature')||'',/^[0-9a-f]{64}$/);assert.equal(h.get('x-kc-client'),'KC-POS');signedRequests++}
function pageFor(items,url){const limit=Math.max(1,Number(url.searchParams.get('limit')||500)),after=url.searchParams.get('after_id');const filtered=after?items.filter(([id])=>id>after):items;const page=filtered.slice(0,limit);return {page,nextCursor:page.length===limit?page.at(-1)?.[0]||null:null}}
global.fetch=async(url,options={})=>{
  const u=String(url),parsed=new URL(u);if(u.includes('/sync/'))assertSigned(options);
  if(parsed.pathname.endsWith('/sync/batch')){
    batches++;
    const body=JSON.parse(options.body||'{}');
    const results=(body.transactions||[]).map(tx=>{
      if(tx.transactionId===forceConflict)return {transactionId:tx.transactionId,status:'CONFLICT'};
      if(remote.has(tx.transactionId))return {transactionId:tx.transactionId,status:'ALREADY_STORED'};
      remote.set(tx.transactionId,tx);return {transactionId:tx.transactionId,status:'STORED'};
    });
    return {ok:true,status:200,json:async()=>({status:'OK',results,conflicts:results.filter(x=>x.status==='CONFLICT')})};
  }
  if(parsed.pathname.endsWith('/sync/reconcile')){
    const body=JSON.parse(options.body||'{}'),ids=Array.isArray(body.transactionIds)?body.transactionIds.map(String):[];reconcileBatchSizes.push(ids.length);assert.ok(ids.length<=1000,'Client darf maximal 1000 IDs pro Reconcile senden.');
    const remoteIds=new Set([...remote.values()].filter(x=>x.registerId===body.registerId).map(x=>String(x.transactionId)));
    const missingRemote=ids.filter(id=>!remoteIds.has(id));
    return {ok:true,status:200,json:async()=>({status:'OK',mode:'membership',missingRemote,matchedCount:ids.length-missingRemote.length,localCount:ids.length})};
  }
  if(parsed.pathname.endsWith('/sync/ids')){
    idPageRequests++;
    const reg=parsed.searchParams.get('register_id')||'',entries=[...remote.entries()].filter(([,x])=>x.registerId===reg).sort(([a],[b])=>String(a).localeCompare(String(b))),{page,nextCursor}=pageFor(entries,parsed);
    return {ok:true,status:200,json:async()=>({status:'OK',registerId:reg,count:page.length,transactionIds:page.map(([id])=>id),nextCursor})};
  }
  if(parsed.pathname.endsWith('/sync/transactions')){
    txPageRequests++;
    const reg=parsed.searchParams.get('register_id')||'',entries=[...remote.entries()].filter(([,x])=>x.registerId===reg).sort(([a],[b])=>String(a).localeCompare(String(b))),{page,nextCursor}=pageFor(entries,parsed);
    return {ok:true,status:200,json:async()=>({status:'OK',registerId:reg,count:page.length,transactions:page.map(([,row])=>row),nextCursor})};
  }
  throw new Error('unexpected fetch '+u);
};
const tx=(id,hash=id,registerId='KASSE-TEST')=>({transactionId:id,registerId,registerName:'Test',time:'2026-08-18T05:00:00Z',recordHash:hash,items:[{id:'x',qty:1}],total:1});
(async()=>{
  localStorage.setItem('kc_transactions_v040',JSON.stringify([tx('T1'),tx('T2')]));
  assert.equal(await sync.enqueueMissing(),2);
  let s=await sync.status();assert.equal(s.pending,2);assert.equal(s.encryption,'AES-256-GCM');assert.equal(s.gatewayAuth,'HMAC-SHA-256');assert.equal(s.authProvisioned,true);assert.equal(s.restoreIntegrity,'KC_TX_DIGEST_V1');assert.equal(s.reconcileChunkSize,1000);assert.equal(s.remotePageSize,500);assert.equal(s.reconcileMinIntervalMs,60000);
  await sync.syncNow();s=await sync.status();assert.equal(s.pending,0);assert.equal(s.acked,2);assert.equal(remote.size,2);assert.equal(batches,1);assert.ok(remote.get('T1')?.syncDigest,'Upload muss stabilen Transport-Digest tragen.');
  const firstReconcileAt=s.lastReconcile;await sync.syncNow();s=await sync.status();assert.equal(remote.size,2);assert.equal(batches,1,'Replay darf bestätigte Datensätze nicht erneut senden.');assert.equal(s.lastReconcile,firstReconcileAt,'Automatischer Reconcile muss innerhalb des Drosselintervalls übersprungen werden.');

  remote.delete('T2');
  let r=await sync.reconcile();assert.deepEqual(r.missingRemote,['T2']);s=await sync.status();assert.equal(s.pending,1);
  await sync.syncNow();assert.equal(remote.has('T2'),true);s=await sync.status();assert.equal(s.pending,0);

  remote.set('T4',await integrity.attachDigest(tx('T4'),{source:'remote-test'}));
  r=await sync.reconcile();assert.equal(r.restoreVerified,true);assert.ok(r.missingLocal.includes('T4'));
  let localRows=JSON.parse(localStorage.getItem('kc_transactions_v040'));const restoredT4=localRows.find(x=>x.transactionId==='T4');assert.ok(restoredT4);assert.equal(restoredT4.syncDigest,undefined,'Transport-Digest darf nicht in das lokale Kassenjournal einsickern.');

  const corrupt=await integrity.attachDigest(tx('T5'),{source:'remote-test'});corrupt.total=99;remote.set('T5',corrupt);
  r=await sync.reconcile();assert.equal(r.restoreRejected,true);localRows=JSON.parse(localStorage.getItem('kc_transactions_v040'));assert.equal(localRows.some(x=>x.transactionId==='T5'),false,'Manipulierter Remote-Datensatz darf nicht lokal gemergt werden.');remote.delete('T5');

  const scaleRows=[];for(let i=0;i<1205;i++){const id=`S${String(i).padStart(4,'0')}`,row=tx(id,id,'KASSE-SCALE');scaleRows.push(row);remote.set(id,row)}
  localRows=JSON.parse(localStorage.getItem('kc_transactions_v040'));localStorage.setItem('kc_transactions_v040',JSON.stringify([...localRows,...scaleRows]));
  const reconcileCountBefore=reconcileBatchSizes.length,idPagesBefore=idPageRequests;
  r=await sync.reconcile();assert.equal(r.restoreVerified,true);assert.deepEqual(r.missingRemote,[]);assert.deepEqual(r.missingLocal,[]);
  const scaleBatches=reconcileBatchSizes.slice(reconcileCountBefore);assert.ok(scaleBatches.length>=2,'Mehr als 1000 lokale IDs müssen in mehrere Reconcile-Batches zerlegt werden.');assert.ok(Math.max(...scaleBatches)<=1000);assert.ok(idPageRequests-idPagesBefore>=3,'1205 Remote-IDs müssen über mehrere 500er Seiten gelesen werden.');
  localStorage.setItem('kc_transactions_v040',JSON.stringify(localRows));for(const row of scaleRows)remote.delete(row.transactionId);

  localRows=JSON.parse(localStorage.getItem('kc_transactions_v040'));localRows.push(tx('T3'));localStorage.setItem('kc_transactions_v040',JSON.stringify(localRows));forceConflict='T3';await sync.syncNow();s=await sync.status();assert.equal(s.pending,1);assert.equal(s.conflicts,1);assert.equal(remote.has('T3'),false);forceConflict=null;

  const st=await sync.selfTest();assert.equal(st.queuePersist,true);assert.equal(st.queueEncrypted,true);assert.equal(st.authProvisioned,true);assert.equal(st.restoreIntegrity,true);assert.equal(st.reconcileChunkSize,1000);assert.equal(st.remotePageSize,500);assert.ok(signedRequests>=12);assert.ok(txPageRequests>=2);
  console.log(JSON.stringify({status:'PASS',offlineQueue:true,encryptedQueue:true,gatewayHmac:true,restoreDigest:true,restoreTamperRejected:true,replayIdempotent:true,reconcileRepair:true,reconcileChunking:true,remotePaging:true,reconcileThrottle:true,conflictRetention:true,selfTest:st,signedRequests,batches,idPageRequests,txPageRequests,maxReconcileBatch:Math.max(...reconcileBatchSizes),remote:remote.size}));
})().catch(e=>{console.error(e);process.exit(1)});
