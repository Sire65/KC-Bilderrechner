'use strict';

const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const auth=require('../exchange-core-v31/exchange-auth.js');

(async()=>{
  const secret='kcb-audit-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const now=Date.now();
  const envelope={
    schema:'KCB-CONFIG-1',
    packageId:'PKG-12345678',
    createdAt:new Date(now-1000).toISOString(),
    validUntil:new Date(now+3600000).toISOString(),
    targetId:'KASSE-01',
    payload:{articles:[{id:'A1',name:'Test',price:5.5}]}
  };

  const signed=await auth.sign(envelope,{secret,keyId:'KASSE-01:v1'});
  assert.equal(signed.integrity.algorithm,auth.AUTH_ALG);
  assert.match(signed.integrity.value,/^[0-9a-f]{64}$/);
  assert.deepEqual(
    await auth.verify(signed,{secret,allowedSchemas:['KCB-CONFIG-1'],now}),
    {ok:true,code:'OK',keyId:'KASSE-01:v1'}
  );

  const tampered=structuredClone(signed);tampered.payload.articles[0].price=1;
  assert.equal((await auth.verify(tampered,{secret,allowedSchemas:['KCB-CONFIG-1'],now})).code,'AUTH_SIGNATURE_MISMATCH');

  const legacy=structuredClone(signed);legacy.integrity={algorithm:'KCB-CHECK-1',value:'deadbeef'};
  assert.equal((await auth.verify(legacy,{secret,allowedSchemas:['KCB-CONFIG-1'],now})).code,'AUTH_ALGORITHM_INVALID');

  const expired=await auth.sign({...envelope,packageId:'PKG-EXPIRED1',validUntil:new Date(now-1000).toISOString()},{secret,keyId:'KASSE-01:v1'});
  assert.equal((await auth.verify(expired,{secret,allowedSchemas:['KCB-CONFIG-1'],now})).code,'PACKAGE_EXPIRED');

  const wrongSchema=await auth.sign({...envelope,schema:'KCB-OTHER-1',packageId:'PKG-OTHER001'},{secret,keyId:'KASSE-01:v1'});
  assert.equal((await auth.verify(wrongSchema,{secret,allowedSchemas:['KCB-CONFIG-1'],now})).code,'SCHEMA_NOT_ALLOWED');

  await assert.rejects(()=>auth.sign(envelope,{secret:'short'}),/EXCHANGE_SECRET_TOO_SHORT/);
  console.log('PASS KCB exchange HMAC rejects tampering, checksum-only legacy, expiry, wrong schemas and weak secrets');
})().catch(error=>{console.error(error);process.exit(1)});
