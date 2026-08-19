(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.KCCashTransferAuth=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION='0.1.0';
  const FORMAT='KC_CASH_TRANSFER_V2';
  const PREFIX='KCASH2:';
  const AUTH_ALG='HMAC-SHA-256';
  const MAX_AGE_MS=36*60*60*1000;
  const enc=new TextEncoder(),dec=new TextDecoder();

  function normalize(value){
    if(value===null)return null;
    if(Array.isArray(value))return value.map(normalize);
    const type=typeof value;
    if(type==='string'||type==='boolean')return value;
    if(type==='number'){
      if(!Number.isFinite(value))throw new Error('CASH_NON_FINITE_NUMBER');
      return Object.is(value,-0)?0:value;
    }
    if(type==='object'){
      const out={};for(const key of Object.keys(value).sort()){if(key==='auth')continue;const item=value[key];if(item!==undefined)out[key]=normalize(item)}return out;
    }
    throw new Error('CASH_UNSUPPORTED_TYPE');
  }
  const canonical=value=>JSON.stringify(normalize(value));
  const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  const unhex=text=>/^[0-9a-f]{64}$/i.test(String(text||''))?Uint8Array.from(String(text).match(/../g),x=>parseInt(x,16)):null;
  async function importKey(secret,usage){
    if(!root.crypto?.subtle)throw new Error('CASH_CRYPTO_UNAVAILABLE');
    if(String(secret||'').length<32)throw new Error('CASH_SECRET_TOO_SHORT');
    return root.crypto.subtle.importKey('raw',enc.encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,[usage]);
  }
  function validatePayload(payload){
    const errors=[];
    if(!payload||payload.format!==FORMAT)errors.push('FORMAT_INVALID');
    if(!/^[A-Za-z0-9._:-]{8,160}$/.test(String(payload?.transferId||'')))errors.push('TRANSFER_ID_INVALID');
    if(!['opening','topup'].includes(payload?.type))errors.push('TYPE_INVALID');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(payload?.effectiveDate||'')))errors.push('EFFECTIVE_DATE_INVALID');
    if(!Number.isFinite(Number(payload?.total))||Number(payload.total)<=0)errors.push('TOTAL_INVALID');
    const shared=payload?.scope==='shared';
    if(shared){if(!Array.isArray(payload.registerIds)||!payload.registerIds.length)errors.push('REGISTER_IDS_REQUIRED')}
    else if(!String(payload?.registerId||'').trim())errors.push('REGISTER_ID_REQUIRED');
    if(!Date.parse(String(payload?.createdAt||'')))errors.push('CREATED_AT_INVALID');
    if(payload?.expiresAt&&!Date.parse(String(payload.expiresAt)))errors.push('EXPIRES_AT_INVALID');
    return errors;
  }
  async function sign(payload,{secret,keyId='default'}={}){
    const copy=JSON.parse(JSON.stringify(payload||{}));copy.format=FORMAT;
    const errors=validatePayload(copy);if(errors.length)throw new Error(errors[0]);
    const key=await importKey(secret,'sign'),signature=hex(new Uint8Array(await root.crypto.subtle.sign('HMAC',key,enc.encode(canonical(copy)))));
    copy.auth={algorithm:AUTH_ALG,keyId:String(keyId||'default').slice(0,80),signature};
    return copy;
  }
  async function verify(envelope,{secret,registerId,effectiveDate,now=Date.now()}={}){
    const errors=validatePayload(envelope);if(errors.length)return{ok:false,code:errors[0]};
    if(envelope?.auth?.algorithm!==AUTH_ALG)return{ok:false,code:'AUTH_ALGORITHM_INVALID'};
    const signature=unhex(envelope?.auth?.signature);if(!signature)return{ok:false,code:'AUTH_SIGNATURE_INVALID'};
    let key;try{key=await importKey(secret,'verify')}catch(error){return{ok:false,code:error.message||'AUTH_KEY_INVALID'}}
    const valid=await root.crypto.subtle.verify('HMAC',key,signature,enc.encode(canonical(envelope)));if(!valid)return{ok:false,code:'AUTH_SIGNATURE_MISMATCH'};
    const created=Date.parse(envelope.createdAt),expires=envelope.expiresAt?Date.parse(envelope.expiresAt):created+MAX_AGE_MS;
    if(now<created-5*60*1000||now>expires)return{ok:false,code:'AUTH_TIME_INVALID'};
    if(effectiveDate&&envelope.effectiveDate!==effectiveDate)return{ok:false,code:'EFFECTIVE_DATE_MISMATCH'};
    if(registerId){const allowed=envelope.scope==='shared'?Array.isArray(envelope.registerIds)&&envelope.registerIds.includes(registerId):envelope.registerId===registerId;if(!allowed)return{ok:false,code:'REGISTER_MISMATCH'}}
    return{ok:true,code:'OK',keyId:String(envelope.auth.keyId||'')};
  }
  function toB64Url(bytes){let text='';for(const b of bytes)text+=String.fromCharCode(b);return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  function fromB64Url(text){const normalized=String(text).replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);return Uint8Array.from(atob(padded),c=>c.charCodeAt(0))}
  function encode(envelope){return PREFIX+toB64Url(enc.encode(JSON.stringify(envelope)))}
  function decode(code){const raw=String(code||'').trim();if(!raw.startsWith(PREFIX))throw new Error('CASH_CODE_FORMAT_INVALID');const parsed=JSON.parse(dec.decode(fromB64Url(raw.slice(PREFIX.length))));if(parsed?.format!==FORMAT)throw new Error('CASH_CODE_FORMAT_INVALID');return parsed}
  return Object.freeze({VERSION,FORMAT,PREFIX,AUTH_ALG,MAX_AGE_MS,canonical,validatePayload,sign,verify,encode,decode});
});
