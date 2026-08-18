const assert=require('node:assert/strict');
const {indexedDB}=require('fake-indexeddb');
const {webcrypto}=require('node:crypto');
class StorageMock{
  constructor(){this.m=new Map()}
  get length(){return this.m.size}
  key(i){return [...this.m.keys()][i]??null}
  getItem(k){return this.m.has(String(k))?this.m.get(String(k)):null}
  setItem(k,v){this.m.set(String(k),String(v))}
  removeItem(k){this.m.delete(String(k))}
  clear(){this.m.clear()}
}
global.Storage=StorageMock;
global.localStorage=new StorageMock();
global.indexedDB=indexedDB;
global.crypto=webcrypto;
global.navigator={storage:{persist:async()=>true,persisted:async()=>true}};
localStorage.setItem('kc_transactions_v040',JSON.stringify([{transactionId:'LEGACY-1',registerId:'K1',total:12.34}]));
localStorage.setItem('kc_cash_movements',JSON.stringify([{id:'CASH-1',total:100}]));
localStorage.setItem('kc_manager_keep','manager-value');
require('../pos/local-vault-bootstrap.js');
(async()=>{
  const vault=global.KCStorageVault;await vault.ready;
  assert.ok(vault);
  assert.match(localStorage.getItem('kc_transactions_v040'),/LEGACY-1/);
  assert.equal(localStorage.getItem('kc_manager_keep'),'manager-value');
  let audit=await vault.audit();
  assert.deepEqual(audit.plaintextLocalStorageKeys,[],'POS plaintext keys must be absent from native localStorage');
  assert.equal(audit.keyExtractable,false,'device AES key must be non-exportable');
  assert.ok(audit.encryptedRecords>=2);
  const marker='SECRET-BOOKING-XYZ';
  localStorage.setItem('kc_transactions_v040',JSON.stringify([{transactionId:marker,registerId:'K1',total:99.99}]));
  await vault.flush();
  assert.match(localStorage.getItem('kc_transactions_v040'),new RegExp(marker));
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('kc_pos_local_vault_v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const rows=await new Promise((resolve,reject)=>{const r=db.transaction('data','readonly').objectStore('data').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  db.close();
  const serialized=JSON.stringify(rows);
  assert.equal(serialized.includes(marker),false,'plaintext business payload must not appear in IndexedDB records');
  assert.equal(serialized.includes('ciphertext'),true);
  const sealed=await vault.sealJson({transactionId:'QUEUE-SECRET',amount:42},'queue-test');
  assert.equal(JSON.stringify(sealed).includes('QUEUE-SECRET'),false);
  const opened=await vault.openJson(sealed,'queue-test');assert.equal(opened.transactionId,'QUEUE-SECRET');
  audit=await vault.audit();assert.deepEqual(audit.plaintextLocalStorageKeys,[]);
  console.log(JSON.stringify({status:'PASS',encryptedIndexedDb:true,legacyMigration:true,plaintextLocalStorage:false,nonExportableKey:true,aesGcmRoundtrip:true,encryptedRecords:audit.encryptedRecords}));
})().catch(e=>{console.error(e);process.exit(1)});
