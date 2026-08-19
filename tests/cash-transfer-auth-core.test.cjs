'use strict';

const assert=require('node:assert/strict');
assert.ok(globalThis.crypto?.subtle,'Node WebCrypto wird für den KCASH2-Test benötigt.');
const core=require('../cores/cash-transfer-auth-core/cash-transfer-auth-core.js');

(async()=>{
  const secret='0123456789abcdef0123456789abcdef0123456789abcdef';
  const now=Date.now(),today='2026-08-19';
  const base={format:core.FORMAT,transferId:'TRANSFER-12345678',type:'opening',scope:'register',registerId:'KASSE-01',effectiveDate:today,total:1200,breakdown:{'50':10,'20':20,'10':30},createdAt:new Date(now-60_000).toISOString(),expiresAt:new Date(now+60*60_000).toISOString()};
  const signed=await core.sign(base,{secret,keyId:'markt-2026'});
  assert.equal(signed.auth.algorithm,'HMAC-SHA-256');
  assert.match(signed.auth.signature,/^[0-9a-f]{64}$/);

  let v=await core.verify(signed,{secret,registerId:'KASSE-01',effectiveDate:today,now});
  assert.equal(v.ok,true);assert.equal(v.keyId,'markt-2026');

  const code=core.encode(signed);assert.ok(code.startsWith('KCASH2:'));
  const decoded=core.decode(code);assert.deepEqual(decoded,signed);
  v=await core.verify(decoded,{secret,registerId:'KASSE-01',effectiveDate:today,now});assert.equal(v.ok,true);

  const tampered=structuredClone(signed);tampered.total=2200;
  v=await core.verify(tampered,{secret,registerId:'KASSE-01',effectiveDate:today,now});assert.equal(v.ok,false);assert.equal(v.code,'AUTH_SIGNATURE_MISMATCH');

  v=await core.verify(signed,{secret,registerId:'KASSE-02',effectiveDate:today,now});assert.equal(v.ok,false);assert.equal(v.code,'REGISTER_MISMATCH');
  v=await core.verify(signed,{secret,registerId:'KASSE-01',effectiveDate:'2026-08-20',now});assert.equal(v.ok,false);assert.equal(v.code,'EFFECTIVE_DATE_MISMATCH');
  v=await core.verify(signed,{secret,registerId:'KASSE-01',effectiveDate:today,now:now+2*60*60_000});assert.equal(v.ok,false);assert.equal(v.code,'AUTH_TIME_INVALID');

  const shared=await core.sign({...base,transferId:'TRANSFER-SHARED-1',scope:'shared',registerId:undefined,registerIds:['KASSE-01','KASSE-02']},{secret,keyId:'markt-2026'});
  v=await core.verify(shared,{secret,registerId:'KASSE-02',effectiveDate:today,now});assert.equal(v.ok,true);
  v=await core.verify(shared,{secret,registerId:'KASSE-03',effectiveDate:today,now});assert.equal(v.ok,false);assert.equal(v.code,'REGISTER_MISMATCH');

  await assert.rejects(()=>core.sign(base,{secret:'too-short'}),/CASH_SECRET_TOO_SHORT/);
  console.log('PASS KCASH2 HMAC authenticity, register binding, validity window and tamper detection');
})().catch(error=>{console.error(error);process.exit(1)});
