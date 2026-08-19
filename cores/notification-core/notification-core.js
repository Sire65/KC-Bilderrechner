(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.NotificationCore=api;
  if(root.document&&api.FailoverSync)api.FailoverSync.autoStart();
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION='0.5.0';
  const PROFILE={beginner:{success:true,info:true,warning:true,error:true},standard:{success:true,info:false,warning:true,error:true},expert:{success:false,info:false,warning:true,error:true}};
  class Controller{
    constructor(node,{profile='standard'}={}){this.node=node;this.profile=PROFILE[profile]?profile:'standard';this.timer=null;this.lastKey='';this.count=0;}
    setProfile(profile){if(PROFILE[profile])this.profile=profile;}
    show({type='info',message='',key='',duration}={}){if(!this.node||!PROFILE[this.profile][type])return false;clearTimeout(this.timer);if(key&&key===this.lastKey)this.count++;else{this.lastKey=key;this.count=1}this.node.className=`notification-bar ${type} visible`;this.node.textContent=message;this.node.setAttribute('role',type==='error'?'alert':'status');const ms=duration??(type==='success'?1400:type==='info'?1800:type==='warning'?3500:0);if(ms>0)this.timer=setTimeout(()=>this.clear(),ms);return true;}
    clear(){if(!this.node)return;this.node.classList.remove('visible');this.node.textContent='';this.lastKey='';this.count=0;}
  }
  const FAILOVER={VERSION:'1.3.0',DB:'kc_pos_failover_v1',QUEUE:'queue',ACK:'ack',TX_KEY:'kc_transactions_v040',GATEWAY_KEY:'kc_failover_gateway_url_v1',AUTH_DEVICE_KEY:'kc_gateway_device_id_v1',AUTH_SECRET_KEY:'kc_gateway_device_secret_v1',DEFAULT_GATEWAY:'https://kc-failover-gateway.ha-joko.workers.dev',interval:null,running:false,lastSync:null,lastError:null,lastReconcile:null};
  const AUTH_VERSION='KC-GW-HMAC-V1';
  function isPos(){try{return /(^|\/)pos(\/|$)/i.test(root.location?.pathname||'')}catch{return false}}
  function gateway(){try{return (root.localStorage?.getItem(FAILOVER.GATEWAY_KEY)||FAILOVER.DEFAULT_GATEWAY).replace(/\/$/,'')}catch{return FAILOVER.DEFAULT_GATEWAY}}
  function openDb(){return new Promise((resolve,reject)=>{const req=root.indexedDB.open(FAILOVER.DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(FAILOVER.QUEUE))db.createObjectStore(FAILOVER.QUEUE,{keyPath:'transactionId'});if(!db.objectStoreNames.contains(FAILOVER.ACK))db.createObjectStore(FAILOVER.ACK,{keyPath:'transactionId'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IDB_OPEN_FAILED'))})}
  async function storeAll(name){const db=await openDb();try{return await new Promise((resolve,reject)=>{const req=db.transaction(name,'readonly').objectStore(name).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}finally{db.close()}}
  async function storePut(name,value){const db=await openDb();try{await new Promise((resolve,reject)=>{const req=db.transaction(name,'readwrite').objectStore(name).put(value);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}finally{db.close()}}
  async function storeDelete(name,key){const db=await openDb();try{await new Promise((resolve,reject)=>{const req=db.transaction(name,'readwrite').objectStore(name).delete(key);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}finally{db.close()}}
  async function queuePut(item){
    const vault=root.KCStorageVault;if(!vault?.sealJson)throw new Error('LOCAL_VAULT_UNAVAILABLE');await vault.ready;
    const sealedPayload=await vault.sealJson(item.payload,`failover:${item.transactionId}`);
    const stored={transactionId:item.transactionId,registerId:item.registerId,recordHash:item.recordHash||null,queuedAt:item.queuedAt||new Date().toISOString(),attempts:Number(item.attempts||0),lastError:item.lastError||null,status:item.status||'PENDING',sealedPayload,encryption:'AES-256-GCM'};
    await storePut(FAILOVER.QUEUE,stored);return stored;
  }
  async function queueAll(){
    const rows=await storeAll(FAILOVER.QUEUE),vault=root.KCStorageVault;if(!vault?.openJson)throw new Error('LOCAL_VAULT_UNAVAILABLE');await vault.ready;
    const out=[];
    for(const row of rows){
      if(row.sealedPayload){try{out.push({...row,payload:await vault.openJson(row.sealedPayload,`failover:${row.transactionId}`)})}catch(error){out.push({...row,payload:null,status:'CORRUPT',lastError:'DECRYPT_FAILED'})}continue}
      if(row.payload){await queuePut(row);const copy={...row,encryption:'AES-256-GCM'};out.push(copy);continue}
      out.push({...row,payload:null,status:'CORRUPT',lastError:'PAYLOAD_MISSING'});
    }
    return out;
  }
  function localTransactions(){try{const rows=JSON.parse(root.localStorage?.getItem(FAILOVER.TX_KEY)||'[]');return Array.isArray(rows)?rows.filter(x=>x&&!x.training&&x.transactionId&&x.registerId):[]}catch{return []}}
  function setHint(pending,error){const node=root.document?.getElementById('systemHint');if(!node)return;if(error)node.textContent=`Notfallqueue ${pending} offen · Cloud-Sync wartet`;else if(pending)node.textContent=`Notfallqueue ${pending} offen · Synchronisierung läuft`;else node.textContent='Offlinefähig · verschlüsselt lokal · Cloud-Sync OK'}
  async function enqueueMissing(){const rows=localTransactions(),acked=new Set((await storeAll(FAILOVER.ACK)).map(x=>x.transactionId)),queued=new Set((await queueAll()).map(x=>x.transactionId));let added=0;for(const tx of rows){if(acked.has(tx.transactionId)||queued.has(tx.transactionId))continue;await queuePut({transactionId:tx.transactionId,registerId:tx.registerId,payload:tx,recordHash:tx.recordHash||null,queuedAt:new Date().toISOString(),attempts:0,lastError:null,status:'PENDING'});added++}return added}
  const hex=bytes=>[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
  async function sha256Hex(text){const digest=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text||'')));return hex(new Uint8Array(digest))}
  function integrityCore(){const core=root.KCTransactionIntegrity;if(!core?.attachDigest||!core?.verifyDigest||!core?.stripTransportDigest)throw new Error('TX_INTEGRITY_CORE_UNAVAILABLE');return core}
  async function attachTransportDigest(transaction){return integrityCore().attachDigest(transaction,{source:'pos-client'})}
  async function verifyRemoteTransactions(rows){
    const core=integrityCore(),clean=[];
    for(const row of Array.isArray(rows)?rows:[]){
      const check=await core.verifyDigest(row);
      if(!check.ok)throw new Error(`REMOTE_${check.code||'DIGEST_INVALID'}`);
      clean.push(core.stripTransportDigest(row));
    }
    return clean;
  }
  async function gatewayAuthConfig(){
    const vault=root.KCStorageVault;
    if(!vault?.ready||typeof vault.protectedKey!=='function'||!vault.protectedKey(FAILOVER.AUTH_SECRET_KEY))throw new Error('LOCAL_VAULT_AUTH_UNAVAILABLE');
    await vault.ready;
    const deviceId=String(root.localStorage?.getItem(FAILOVER.AUTH_DEVICE_KEY)||'').trim(),secret=String(root.localStorage?.getItem(FAILOVER.AUTH_SECRET_KEY)||'');
    if(!/^[A-Za-z0-9._:-]{1,100}$/.test(deviceId)||secret.length<32)throw new Error('GATEWAY_DEVICE_NOT_PROVISIONED');
    return{deviceId,secret};
  }
  async function signGatewayInit(url,options={}){
    const u=new URL(String(url),root.location?.href),path=u.pathname+u.search;
    if(!path.startsWith('/sync/'))return options;
    if(!root.crypto?.subtle||typeof root.crypto.randomUUID!=='function')throw new Error('GATEWAY_AUTH_CRYPTO_UNAVAILABLE');
    const {deviceId,secret}=await gatewayAuthConfig(),timestamp=String(Date.now()),nonce=root.crypto.randomUUID(),bodyText=typeof options.body==='string'?options.body:'',bodyHash=await sha256Hex(bodyText),payload=`${AUTH_VERSION}\n${deviceId}\n${timestamp}\n${nonce}\n${String(options.method||'GET').toUpperCase()}\n${path}\n${bodyHash}`,key=await root.crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),signature=hex(new Uint8Array(await root.crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)))),headers=new Headers(options.headers||{});
    headers.set('x-kc-client','KC-POS');headers.set('x-kc-device',deviceId);headers.set('x-kc-timestamp',timestamp);headers.set('x-kc-nonce',nonce);headers.set('x-kc-signature',signature);
    return{...options,headers};
  }
  async function fetchJson(url,options={},timeout=7000){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);try{const signed=await signGatewayInit(url,options),r=await fetch(url,{...signed,cache:'no-store',signal:ctl.signal});let body={};try{body=await r.json()}catch{}if(!r.ok&&r.status!==207&&r.status!==409)throw new Error(`HTTP_${r.status}`);return {status:r.status,body}}finally{clearTimeout(timer)}}
  async function markAck(id,status){await storePut(FAILOVER.ACK,{transactionId:id,status,syncedAt:new Date().toISOString()});await storeDelete(FAILOVER.QUEUE,id)}
  async function reconcile(){
    const rows=localTransactions();if(!rows.length)return {missingRemote:[],missingLocal:[]};
    const groups=new Map();for(const row of rows){if(!groups.has(row.registerId))groups.set(row.registerId,[]);groups.get(row.registerId).push(row)}
    let totalRemote=0,totalLocal=0,missingRemote=[],missingLocal=[];
    for(const [registerId,list] of groups){
      let reply;try{reply=await fetchJson(`${gateway()}/sync/reconcile`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({registerId,transactionIds:list.map(x=>x.transactionId)})},9000)}catch(error){FAILOVER.lastError=error instanceof Error?error.message:String(error);return null}
      const body=reply.body||{};totalRemote+=Number(body.remoteCount||0);totalLocal+=Number(body.localCount||0);
      for(const id of body.missingRemote||[]){missingRemote.push(id);await storeDelete(FAILOVER.ACK,id);const tx=list.find(x=>x.transactionId===id);if(tx)await queuePut({transactionId:id,registerId,payload:tx,recordHash:tx.recordHash||null,queuedAt:new Date().toISOString(),attempts:0,lastError:null,status:'PENDING'})}
      if(Array.isArray(body.missingLocal)&&body.missingLocal.length){
        missingLocal.push(...body.missingLocal);
        try{
          const r=await fetchJson(`${gateway()}/sync/transactions?register_id=${encodeURIComponent(registerId)}`,{},10000),received=Array.isArray(r.body?.transactions)?r.body.transactions:[],remote=await verifyRemoteTransactions(received),current=localTransactions(),map=new Map(current.map(x=>[x.transactionId,x]));
          for(const tx of remote)if(tx?.transactionId&&!map.has(tx.transactionId))map.set(tx.transactionId,tx);
          const merged=[...map.values()].sort((a,b)=>String(a.time||a.endTime||'').localeCompare(String(b.time||b.endTime||'')));
          if(root.KCStorageVault?.setItemDurable)await root.KCStorageVault.setItemDurable(FAILOVER.TX_KEY,JSON.stringify(merged));else root.localStorage?.setItem(FAILOVER.TX_KEY,JSON.stringify(merged));
        }catch(error){FAILOVER.lastError=error instanceof Error?error.message:String(error);return {missingRemote,missingLocal,remoteCount:totalRemote,localCount:totalLocal,restoreRejected:true}}
      }
    }
    FAILOVER.lastError=null;FAILOVER.lastReconcile=new Date().toISOString();return {missingRemote,missingLocal,remoteCount:totalRemote,localCount:totalLocal,restoreVerified:true}
  }
  async function flush(){
    if(FAILOVER.running)return;FAILOVER.running=true;
    try{
      if(root.KCStorageVault?.ready)await root.KCStorageVault.ready;await enqueueMissing();let pending=await queueAll();
      for(let i=0;i<pending.length;i+=50){
        const batch=pending.slice(i,i+50).filter(x=>x.payload&&x.status!=='CORRUPT');if(!batch.length)continue;let reply;
        try{const transactions=await Promise.all(batch.map(x=>attachTransportDigest(x.payload)));reply=await fetchJson(`${gateway()}/sync/batch`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({transactions})},9000)}catch(error){FAILOVER.lastError=error instanceof Error?error.message:String(error);for(const item of batch)await queuePut({...item,attempts:Number(item.attempts||0)+1,lastError:FAILOVER.lastError,status:'PENDING'});break}
        const results=Array.isArray(reply.body?.results)?reply.body.results:[];for(const result of results){if(result.status==='STORED'||result.status==='ALREADY_STORED')await markAck(result.transactionId,result.status);else if(result.status==='CONFLICT'){const item=batch.find(x=>x.transactionId===result.transactionId);if(item)await queuePut({...item,attempts:Number(item.attempts||0)+1,lastError:'CONFLICT',status:'CONFLICT'})}}FAILOVER.lastError=null;FAILOVER.lastSync=new Date().toISOString()
      }
      const left=await queueAll();setHint(left.length,FAILOVER.lastError);if(!left.some(x=>x.status==='CONFLICT'||x.status==='CORRUPT'))await reconcile()
    }finally{FAILOVER.running=false}
  }
  async function selfTest(){
    if(root.KCStorageVault?.ready)await root.KCStorageVault.ready;
    const id=`SELFTEST-${root.crypto.randomUUID()}`,payload={transactionId:id,registerId:'KC-QUEUE-SELFTEST',recordHash:id};await queuePut({transactionId:id,registerId:payload.registerId,payload,recordHash:id,queuedAt:new Date().toISOString(),attempts:0,lastError:null,status:'SELFTEST'});
    const raw=(await storeAll(FAILOVER.QUEUE)).find(x=>x.transactionId===id),read=(await queueAll()).find(x=>x.transactionId===id),encrypted=!!raw?.sealedPayload&&!Object.prototype.hasOwnProperty.call(raw,'payload'),persisted=read?.payload?.transactionId===id;await storeDelete(FAILOVER.QUEUE,id);const removed=!(await storeAll(FAILOVER.QUEUE)).some(x=>x.transactionId===id);
    let authProvisioned=false;try{await gatewayAuthConfig();authProvisioned=true}catch{}
    let integrity=false;try{const wrapped=await attachTransportDigest(payload),check=await integrityCore().verifyDigest(wrapped);integrity=check.ok===true}catch{}
    return {queuePersist:persisted&&removed,queueEncrypted:encrypted,indexedDb:true,authProvisioned,restoreIntegrity:integrity,version:FAILOVER.VERSION}
  }
  async function status(){const q=await queueAll(),a=await storeAll(FAILOVER.ACK);let authProvisioned=false;try{await gatewayAuthConfig();authProvisioned=true}catch{}return {version:FAILOVER.VERSION,gateway:gateway(),pending:q.length,conflicts:q.filter(x=>x.status==='CONFLICT').length,corrupt:q.filter(x=>x.status==='CORRUPT').length,acked:a.length,lastSync:FAILOVER.lastSync,lastError:FAILOVER.lastError,lastReconcile:FAILOVER.lastReconcile,encryption:'AES-256-GCM',gatewayAuth:'HMAC-SHA-256',authProvisioned,restoreIntegrity:'KC_TX_DIGEST_V1'}}
  function start(){if(!isPos()||FAILOVER.interval||!root.indexedDB)return;const kick=()=>flush().catch(error=>{FAILOVER.lastError=error instanceof Error?error.message:String(error)});root.addEventListener?.('online',kick);root.addEventListener?.('storage',event=>{if(event.key===FAILOVER.TX_KEY)kick()});root.addEventListener?.('kc-local-vault-ready',kick);root.document?.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='visible')kick()});FAILOVER.interval=root.setInterval(kick,5000);root.setTimeout(kick,1200)}
  const FailoverSync=Object.freeze({VERSION:FAILOVER.VERSION,start,autoStart:start,syncNow:flush,reconcile,status,selfTest,enqueueMissing,gateway,signGatewayInit,attachTransportDigest,verifyRemoteTransactions});
  root.KCFailoverSync=FailoverSync;
  return Object.freeze({VERSION,PROFILE,Controller,FailoverSync});
});
