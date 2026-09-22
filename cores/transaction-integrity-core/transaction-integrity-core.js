(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.KCTransactionIntegrity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION='0.1.0';
  const FORMAT='KC_TX_DIGEST_V1';
  const MAX_CANONICAL_BYTES=256000;
  const MAX_DEPTH=32;
  const enc=new TextEncoder();

  function normalize(value,depth=0){
    if(depth>MAX_DEPTH)throw new Error('DIGEST_MAX_DEPTH');
    if(value===null)return null;
    const type=typeof value;
    if(type==='string'||type==='boolean')return value;
    if(type==='number'){
      if(!Number.isFinite(value))throw new Error('DIGEST_NON_FINITE_NUMBER');
      return Object.is(value,-0)?0:value;
    }
    if(Array.isArray(value))return value.map(item=>item===undefined?null:normalize(item,depth+1));
    if(type==='object'){
      const out={};
      for(const key of Object.keys(value).sort()){
        if(key==='syncDigest'||key==='syncDigestFormat'||key==='syncDigestSource')continue;
        const item=value[key];
        if(item===undefined||typeof item==='function'||typeof item==='symbol')continue;
        out[key]=normalize(item,depth+1);
      }
      return out;
    }
    throw new Error('DIGEST_UNSUPPORTED_TYPE');
  }
  function canonicalize(value){
    const text=JSON.stringify(normalize(value));
    if(enc.encode(text).byteLength>MAX_CANONICAL_BYTES)throw new Error('DIGEST_PAYLOAD_TOO_LARGE');
    return text;
  }
  const toHex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  async function sha256Hex(text){
    if(!root.crypto?.subtle)throw new Error('DIGEST_CRYPTO_UNAVAILABLE');
    return toHex(new Uint8Array(await root.crypto.subtle.digest('SHA-256',enc.encode(String(text)))));
  }
  async function digestTransaction(transaction){return sha256Hex(canonicalize(transaction))}
  async function attachDigest(transaction,{source='client'}={}){
    const copy=JSON.parse(JSON.stringify(transaction));
    copy.syncDigestFormat=FORMAT;
    copy.syncDigestSource=String(source||'client').slice(0,40);
    copy.syncDigest=await digestTransaction(copy);
    return copy;
  }
  async function verifyDigest(transaction){
    if(!transaction||transaction.syncDigestFormat!==FORMAT||!/^[0-9a-f]{64}$/i.test(String(transaction.syncDigest||'')))return{ok:false,code:'DIGEST_MISSING'};
    const expected=await digestTransaction(transaction),actual=String(transaction.syncDigest).toLowerCase();
    return expected===actual?{ok:true,code:'DIGEST_OK',digest:actual}:{ok:false,code:'DIGEST_MISMATCH',expected,actual};
  }
  function stripTransportDigest(transaction){
    const copy=JSON.parse(JSON.stringify(transaction));
    delete copy.syncDigest;delete copy.syncDigestFormat;delete copy.syncDigestSource;
    return copy;
  }
  return Object.freeze({VERSION,FORMAT,MAX_CANONICAL_BYTES,canonicalize,digestTransaction,attachDigest,verifyDigest,stripTransportDigest});
});
