'use strict';

const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
global.crypto=webcrypto;
const core=require('../cores/transaction-integrity-core/transaction-integrity-core.js');

(async()=>{
  const a={transactionId:'T-1',registerId:'KASSE-01',total:12.5,items:[{id:'A',qty:1,meta:{b:2,a:1}}],recordHash:'abc'};
  const b={recordHash:'abc',items:[{meta:{a:1,b:2},qty:1,id:'A'}],total:12.5,registerId:'KASSE-01',transactionId:'T-1'};
  const da=await core.digestTransaction(a),db=await core.digestTransaction(b);
  assert.equal(da,db,'Objekt-Schlüsselreihenfolge darf den Digest nicht verändern.');
  assert.match(da,/^[0-9a-f]{64}$/);

  const signed=await core.attachDigest(a,{source:'client'});
  let v=await core.verifyDigest(signed);
  assert.equal(v.ok,true);
  assert.equal(signed.syncDigestFormat,'KC_TX_DIGEST_V1');

  const reordered={syncDigest:signed.syncDigest,syncDigestFormat:signed.syncDigestFormat,syncDigestSource:'transport',items:signed.items,registerId:signed.registerId,transactionId:signed.transactionId,total:signed.total,recordHash:signed.recordHash};
  v=await core.verifyDigest(reordered);
  assert.equal(v.ok,true,'Transportmetadaten und Schlüsselreihenfolge dürfen die Inhaltsprüfung nicht brechen.');

  const tampered=structuredClone(signed);tampered.total=99;
  v=await core.verifyDigest(tampered);
  assert.equal(v.ok,false);assert.equal(v.code,'DIGEST_MISMATCH');

  const stripped=core.stripTransportDigest(signed);
  assert.deepEqual(stripped,a,'Nach erfolgreicher Restore-Prüfung muss der lokale Originaldatensatz wiederherstellbar sein.');

  v=await core.verifyDigest(a);assert.equal(v.ok,false);assert.equal(v.code,'DIGEST_MISSING');
  assert.throws(()=>core.canonicalize({x:Infinity}),/DIGEST_NON_FINITE_NUMBER/);

  console.log('PASS TransactionIntegrity stable digest detects restore tampering and survives key reordering');
})().catch(error=>{console.error(error);process.exit(1)});
