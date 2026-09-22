/* KC MarktKasse SecurityCore – Crypto & Secure Sync Module V0.3.1
 * Uses browser WebCrypto only. No custom cryptographic algorithm.
 * AES-256-GCM: confidentiality + integrity. PBKDF2-SHA-256 derives a per-project key.
 */
(function(global){
  "use strict";
  const enc=new TextEncoder(), dec=new TextDecoder();
  const KDF_ITERATIONS=310000,MIN_KDF_ITERATIONS=100000,MAX_KDF_ITERATIONS=1000000;
  const MAX_CIPHERTEXT_BYTES=2_000_000;
  const b64=bytes=>btoa(String.fromCharCode(...bytes));
  const unb64=text=>Uint8Array.from(atob(String(text||"")),c=>c.charCodeAt(0));
  const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));

  function safeIterations(value){
    const n=Number(value??KDF_ITERATIONS);
    if(!Number.isInteger(n)||n<MIN_KDF_ITERATIONS||n>MAX_KDF_ITERATIONS)throw new Error("Ungültige PBKDF2-Iterationszahl im Sync-Paket.");
    return n;
  }
  function validateEnvelope(envelope){
    if(!envelope||envelope.format!=="KC_SECURE_SYNC_V1")throw new Error("Unbekanntes oder unverschlüsseltes Sync-Paket.");
    if(envelope.algorithm!=="AES-256-GCM"||envelope.kdf!=="PBKDF2-SHA-256")throw new Error("Nicht unterstützte Kryptografie im Sync-Paket.");
    if(String(envelope.projectId||"").length<1||String(envelope.projectId).length>120)throw new Error("Ungültige Projekt-ID im Sync-Paket.");
    if(String(envelope.aad||"KC_SECURE_SYNC_V1").length>160)throw new Error("Ungültige Zusatzdaten im Sync-Paket.");
    const iterations=safeIterations(envelope.iterations);
    let salt,iv,ciphertext;
    try{salt=unb64(envelope.salt);iv=unb64(envelope.iv);ciphertext=unb64(envelope.ciphertext)}catch{throw new Error("Sync-Paket enthält ungültige Base64-Daten.")}
    if(salt.length!==16)throw new Error("Ungültige Salt-Länge im Sync-Paket.");
    if(iv.length!==12)throw new Error("Ungültige AES-GCM-IV-Länge im Sync-Paket.");
    if(ciphertext.length<16||ciphertext.length>MAX_CIPHERTEXT_BYTES)throw new Error("Ungültige oder zu große Nutzlast im Sync-Paket.");
    return{iterations,salt,iv,ciphertext};
  }
  async function deriveKey(secret,salt,iterations=KDF_ITERATIONS){
    if(!global.crypto?.subtle)throw new Error("WebCrypto ist auf diesem Gerät nicht verfügbar.");
    if(String(secret||"").length<16)throw new Error("Der Übertragungsschlüssel muss mindestens 16 Zeichen lang sein.");
    iterations=safeIterations(iterations);
    const material=await crypto.subtle.importKey("raw",enc.encode(secret),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  async function encryptEnvelope(payload,{secret,projectId="default",aad="KC_SECURE_SYNC_V1"}={}){
    if(String(projectId||"").length<1||String(projectId).length>120)throw new Error("Ungültige Projekt-ID.");
    if(String(aad||"").length>160)throw new Error("Ungültige Zusatzdaten.");
    const salt=randomBytes(16),iv=randomBytes(12),iterations=KDF_ITERATIONS;
    const key=await deriveKey(secret,salt,iterations);
    const additionalData=enc.encode(`${aad}|${projectId}`);
    const plain=enc.encode(JSON.stringify(payload));
    if(plain.length>MAX_CIPHERTEXT_BYTES-16)throw new Error("Sync-Nutzlast ist zu groß.");
    const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData,tagLength:128},key,plain);
    return {format:"KC_SECURE_SYNC_V1",algorithm:"AES-256-GCM",kdf:"PBKDF2-SHA-256",iterations,projectId,salt:b64(salt),iv:b64(iv),aad,ciphertext:b64(new Uint8Array(cipher)),createdAt:new Date().toISOString()};
  }
  async function decryptEnvelope(envelope,{secret,projectId}={}){
    const parsed=validateEnvelope(envelope);
    if(projectId&&envelope.projectId!==projectId)throw new Error("Sync-Paket gehört zu einem anderen Projekt.");
    const key=await deriveKey(secret,parsed.salt,parsed.iterations);
    const additionalData=enc.encode(`${envelope.aad||"KC_SECURE_SYNC_V1"}|${envelope.projectId}`);
    try{
      const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:parsed.iv,additionalData,tagLength:128},key,parsed.ciphertext);
      return JSON.parse(dec.decode(plain));
    }catch(_){throw new Error("Paketprüfung fehlgeschlagen: falscher Schlüssel oder manipulierte Daten.");}
  }
  function createOperationId(prefix="op"){
    return `${prefix}_${crypto.randomUUID()}`;
  }
  function normalizeQueueItem(item){
    const now=new Date().toISOString();
    return {...item,operationId:item.operationId||createOperationId(item.entity||"op"),status:item.status||"pending",queuedAt:item.queuedAt||now,attempts:Number(item.attempts||0),nextAttemptAt:item.nextAttemptAt||now};
  }
  function nextRetry(attempts){
    const seconds=Math.min(900,Math.max(5,2**Math.min(Number(attempts||0),8)*5));
    return new Date(Date.now()+seconds*1000).toISOString();
  }
  global.KCSecureSync={version:"0.3.1",encryptEnvelope,decryptEnvelope,createOperationId,normalizeQueueItem,nextRetry,validateEnvelope,capabilities:()=>({webCrypto:!!global.crypto?.subtle,aesGcm:true,integrityProtection:true,replayId:true,boundedKdf:true,boundedEnvelope:true})};
})(window);
