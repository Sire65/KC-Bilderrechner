(function(root){
  'use strict';
  const VERSION='1.0.0';
  const DB_NAME='kc_pos_local_vault_v1';
  const DB_VERSION=1;
  const DATA='data';
  const KEYS='keys';
  const DEVICE_KEY='device-aes-gcm-v1';
  const enc=new TextEncoder(),dec=new TextDecoder();
  const memory=new Map();
  const native={
    get:Storage.prototype.getItem,
    set:Storage.prototype.setItem,
    remove:Storage.prototype.removeItem,
    key:Storage.prototype.key
  };
  let db=null,cryptoKey=null,writeChain=Promise.resolve(),readyResolve,readyReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});

  function protectedKey(key){
    key=String(key||'');
    if(!key.startsWith('kc_'))return false;
    if(key.startsWith('kc_manager_')||key.startsWith('kc_dp_')||key.startsWith('kc_core_'))return false;
    return true;
  }
  function bytesToB64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
  function b64ToBytes(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
  function idbReq(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IDB_REQUEST_FAILED'))})}
  function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('IDB_TX_FAILED'));tx.onabort=()=>reject(tx.error||new Error('IDB_TX_ABORTED'))})}
  async function openDb(){
    if(db)return db;
    db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const d=req.result;
        if(!d.objectStoreNames.contains(DATA))d.createObjectStore(DATA,{keyPath:'key'});
        if(!d.objectStoreNames.contains(KEYS))d.createObjectStore(KEYS,{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('VAULT_OPEN_FAILED'));
    });
    return db;
  }
  async function loadOrCreateKey(){
    const d=await openDb(),tx=d.transaction(KEYS,'readwrite'),store=tx.objectStore(KEYS);
    const existing=await idbReq(store.get(DEVICE_KEY));
    if(existing?.key){await txDone(tx);return existing.key}
    const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    store.put({id:DEVICE_KEY,key,createdAt:new Date().toISOString(),extractable:false,algorithm:'AES-GCM-256'});
    await txDone(tx);return key;
  }
  async function sealText(value,aad=''){
    await ready;
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const params={name:'AES-GCM',iv};if(aad)params.additionalData=enc.encode(aad);
    const cipher=await crypto.subtle.encrypt(params,cryptoKey,enc.encode(String(value)));
    return {format:'KC_LOCAL_VAULT_AES_GCM_V1',alg:'AES-256-GCM',iv:bytesToB64(iv),ciphertext:bytesToB64(new Uint8Array(cipher))};
  }
  async function openText(wrapper,aad=''){
    await ready;
    if(wrapper?.format!=='KC_LOCAL_VAULT_AES_GCM_V1')throw new Error('VAULT_FORMAT_INVALID');
    const params={name:'AES-GCM',iv:b64ToBytes(wrapper.iv)};if(aad)params.additionalData=enc.encode(aad);
    const plain=await crypto.subtle.decrypt(params,cryptoKey,b64ToBytes(wrapper.ciphertext));
    return dec.decode(plain);
  }
  async function sealJson(value,aad=''){return sealText(JSON.stringify(value),aad)}
  async function openJson(wrapper,aad=''){return JSON.parse(await openText(wrapper,aad))}
  async function persist(key,value){
    const d=await openDb(),sealed=await sealText(value,`localStorage:${key}`),tx=d.transaction(DATA,'readwrite');
    tx.objectStore(DATA).put({key,sealed,updatedAt:new Date().toISOString()});await txDone(tx);
  }
  async function removePersisted(key){const d=await openDb(),tx=d.transaction(DATA,'readwrite');tx.objectStore(DATA).delete(key);await txDone(tx)}
  function schedule(task){writeChain=writeChain.then(task,task);return writeChain}

  // Capture legacy POS localStorage before replacing the synchronous API.
  const legacy=[];
  try{for(let i=0;i<root.localStorage.length;i++){const k=native.key.call(root.localStorage,i);if(protectedKey(k))legacy.push([k,native.get.call(root.localStorage,k)])}}catch{}

  const originalGet=native.get,originalSet=native.set,originalRemove=native.remove;
  Storage.prototype.getItem=function(key){if(this===root.localStorage&&protectedKey(key))return memory.has(String(key))?memory.get(String(key)):null;return originalGet.call(this,key)};
  Storage.prototype.setItem=function(key,value){
    if(this===root.localStorage&&protectedKey(key)){
      key=String(key);value=String(value);memory.set(key,value);schedule(()=>persist(key,value));
      try{originalRemove.call(this,key)}catch{};return;
    }
    return originalSet.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key){
    if(this===root.localStorage&&protectedKey(key)){
      key=String(key);memory.delete(key);schedule(()=>removePersisted(key));try{originalRemove.call(this,key)}catch{};return;
    }
    return originalRemove.call(this,key);
  };

  async function hydrate(){
    if(!root.indexedDB||!root.crypto?.subtle)throw new Error('LOCAL_VAULT_REQUIREMENTS_UNAVAILABLE');
    await openDb();cryptoKey=await loadOrCreateKey();
    const tx=db.transaction(DATA,'readonly'),rows=await idbReq(tx.objectStore(DATA).getAll());await txDone(tx);
    for(const row of rows){try{memory.set(row.key,await openTextDirect(row.sealed,`localStorage:${row.key}`))}catch(error){console.error('KC Local Vault: Datensatz konnte nicht entschlüsselt werden',row.key,error)}}
    for(const [key,value] of legacy){
      if(value==null)continue;
      if(!memory.has(key))memory.set(key,value);
      await persistDirect(key,memory.get(key));
      try{originalRemove.call(root.localStorage,key)}catch{}
    }
    try{await navigator.storage?.persist?.()}catch{}
    readyResolve(true);
    root.dispatchEvent?.(new CustomEvent('kc-local-vault-ready',{detail:{version:VERSION,migratedLegacy:legacy.length,records:memory.size}}));
  }
  async function openTextDirect(wrapper,aad=''){
    if(wrapper?.format!=='KC_LOCAL_VAULT_AES_GCM_V1')throw new Error('VAULT_FORMAT_INVALID');
    const params={name:'AES-GCM',iv:b64ToBytes(wrapper.iv)};if(aad)params.additionalData=enc.encode(aad);
    const plain=await crypto.subtle.decrypt(params,cryptoKey,b64ToBytes(wrapper.ciphertext));return dec.decode(plain);
  }
  async function persistDirect(key,value){
    const iv=crypto.getRandomValues(new Uint8Array(12)),params={name:'AES-GCM',iv,additionalData:enc.encode(`localStorage:${key}`)};
    const cipher=await crypto.subtle.encrypt(params,cryptoKey,enc.encode(String(value)));
    const sealed={format:'KC_LOCAL_VAULT_AES_GCM_V1',alg:'AES-256-GCM',iv:bytesToB64(iv),ciphertext:bytesToB64(new Uint8Array(cipher))};
    const tx=db.transaction(DATA,'readwrite');tx.objectStore(DATA).put({key,sealed,updatedAt:new Date().toISOString()});await txDone(tx);
  }
  async function flush(){await ready;await writeChain;return true}
  async function audit(){
    await flush();const nativeProtected=[];try{for(let i=0;i<root.localStorage.length;i++){const k=native.key.call(root.localStorage,i);if(protectedKey(k))nativeProtected.push(k)}}catch{}
    const d=await openDb(),tx=d.transaction(DATA,'readonly'),rows=await idbReq(tx.objectStore(DATA).getAll());await txDone(tx);
    return {version:VERSION,encryptedRecords:rows.length,memoryRecords:memory.size,plaintextLocalStorageKeys:nativeProtected,keyExtractable:cryptoKey?.extractable===true,persistentStorage:await navigator.storage?.persisted?.().catch(()=>false)};
  }
  async function setItemDurable(key,value){if(!protectedKey(key))throw new Error('VAULT_KEY_NOT_PROTECTED');root.localStorage.setItem(key,value);await flush();return true}
  function getItem(key){return root.localStorage.getItem(key)}
  const api=Object.freeze({VERSION,ready,flush,audit,protectedKey,setItemDurable,getItem,sealJson,openJson,sealText,openText});
  root.KCStorageVault=api;
  hydrate().catch(error=>{console.error('KC Local Vault konnte nicht gestartet werden',error);readyReject(error)});
})(typeof globalThis!=='undefined'?globalThis:window);
