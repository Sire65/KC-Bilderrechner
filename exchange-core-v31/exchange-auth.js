(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.KCBExchangeAuth=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION='1.0.0';
  const AUTH_ALG='KCB-HMAC-SHA256-1';
  const MAX_EVENT_AGE_MS=30*24*60*60*1000;
  const CLOCK_SKEW_MS=5*60*1000;
  const enc=new TextEncoder();

  function normalize(value){
    if(value===null)return null;
    if(Array.isArray(value))return value.map(normalize);
    const type=typeof value;
    if(type==='string'||type==='boolean')return value;
    if(type==='number'){
      if(!Number.isFinite(value))throw new Error('EXCHANGE_NON_FINITE_NUMBER');
      return Object.is(value,-0)?0:value;
    }
    if(type==='object'){
      const out={};
      for(const key of Object.keys(value).sort()){
        const item=value[key];
        if(item!==undefined)out[key]=normalize(item);
      }
      return out;
    }
    throw new Error('EXCHANGE_UNSUPPORTED_TYPE');
  }
  function canonical(envelope){
    const copy=JSON.parse(JSON.stringify(envelope||{}));
    const keyId=String(copy?.integrity?.keyId||'default').slice(0,120);
    copy.integrity={algorithm:AUTH_ALG,keyId,value:''};
    return JSON.stringify(normalize(copy));
  }
  const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  const unhex=text=>/^[0-9a-f]{64}$/i.test(String(text||''))?Uint8Array.from(String(text).match(/../g),x=>parseInt(x,16)):null;
  async function importKey(secret,usage){
    if(!root.crypto?.subtle)throw new Error('EXCHANGE_CRYPTO_UNAVAILABLE');
    if(String(secret||'').length<32)throw new Error('EXCHANGE_SECRET_TOO_SHORT');
    return root.crypto.subtle.importKey('raw',enc.encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,[usage]);
  }
  function validateEnvelope(envelope,allowedSchemas=[]){
    const errors=[];
    if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))return['ENVELOPE_INVALID'];
    if(allowedSchemas.length&&!allowedSchemas.includes(envelope.schema))errors.push('SCHEMA_NOT_ALLOWED');
    if(!/^[A-Za-z0-9._:-]{8,160}$/.test(String(envelope.packageId||'')))errors.push('PACKAGE_ID_INVALID');
    if(!Date.parse(String(envelope.createdAt||'')))errors.push('CREATED_AT_INVALID');
    if(envelope.validUntil!==undefined&&!Date.parse(String(envelope.validUntil||'')))errors.push('VALID_UNTIL_INVALID');
    return errors;
  }
  async function sign(envelope,{secret,keyId='default'}={}){
    const copy=JSON.parse(JSON.stringify(envelope||{}));
    const errors=validateEnvelope(copy);if(errors.length)throw new Error(errors[0]);
    copy.integrity={algorithm:AUTH_ALG,keyId:String(keyId||'default').slice(0,120),value:''};
    const key=await importKey(secret,'sign');
    copy.integrity.value=hex(new Uint8Array(await root.crypto.subtle.sign('HMAC',key,enc.encode(canonical(copy)))));
    return copy;
  }
  async function verify(envelope,{secret,allowedSchemas=[],now=Date.now()}={}){
    const errors=validateEnvelope(envelope,allowedSchemas);if(errors.length)return{ok:false,code:errors[0]};
    if(envelope?.integrity?.algorithm!==AUTH_ALG)return{ok:false,code:'AUTH_ALGORITHM_INVALID'};
    if(!/^[A-Za-z0-9._:-]{1,120}$/.test(String(envelope?.integrity?.keyId||'')))return{ok:false,code:'AUTH_KEY_ID_INVALID'};
    const signature=unhex(envelope?.integrity?.value);if(!signature)return{ok:false,code:'AUTH_SIGNATURE_INVALID'};
    let key;try{key=await importKey(secret,'verify')}catch(error){return{ok:false,code:error.message||'AUTH_KEY_INVALID'}}
    const valid=await root.crypto.subtle.verify('HMAC',key,signature,enc.encode(canonical(envelope)));
    if(!valid)return{ok:false,code:'AUTH_SIGNATURE_MISMATCH'};
    const created=Date.parse(envelope.createdAt);
    if(now<created-CLOCK_SKEW_MS)return{ok:false,code:'CREATED_AT_IN_FUTURE'};
    if(envelope.schema==='KCB-CONFIG-1'){
      if(!envelope.validUntil)return{ok:false,code:'VALID_UNTIL_REQUIRED'};
      if(now>Date.parse(envelope.validUntil))return{ok:false,code:'PACKAGE_EXPIRED'};
    }else if(now>created+MAX_EVENT_AGE_MS)return{ok:false,code:'PACKAGE_TOO_OLD'};
    return{ok:true,code:'OK',keyId:String(envelope.integrity.keyId)};
  }
  return Object.freeze({VERSION,AUTH_ALG,MAX_EVENT_AGE_MS,CLOCK_SKEW_MS,canonical,validateEnvelope,sign,verify});
});
