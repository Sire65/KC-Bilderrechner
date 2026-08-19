(function(root,doc){
  'use strict';
  const VERSION='0.1.0';
  const SECRET_KEY='kc_exchange_secret_v2';
  const USED_KEY='kc_pos_exchange_used';
  const MAX_IMPORT_BYTES=5*1024*1024;
  const verifiedPackages=new Set();
  const state={ready:false,lastError:null};

  const api=Object.freeze({
    VERSION,
    SECRET_KEY,
    MAX_IMPORT_BYTES,
    get ready(){return state.ready},
    get lastError(){return state.lastError}
  });
  root.KCBExchangeAuthPOS=api;

  const byId=id=>doc.getElementById(id);
  function setStatus(text){const node=byId('kcExchangePosStatus');if(node)node.textContent=String(text||'')}
  function registerId(){
    try{return String(JSON.parse(root.localStorage.getItem('kc_master_v040')||'{}')?.registerId||'KASSE-01')}
    catch{return 'KASSE-01'}
  }
  async function exchangeSecret(){
    const vault=root.KCStorageVault;
    if(!vault?.ready||typeof vault.protectedKey!=='function'||!vault.protectedKey(SECRET_KEY))throw new Error('Sicherer Austauschschlüssel-Speicher ist nicht verfügbar');
    await vault.ready;
    const secret=String(root.localStorage.getItem(SECRET_KEY)||'');
    if(secret.length<32)throw new Error('Austauschschlüssel ist noch nicht sicher provisioniert');
    return secret;
  }
  async function signPackage(pkg){
    const auth=root.KCBExchangeAuth;
    if(!auth)throw new Error('KCB-Herkunftsauthentifizierung ist nicht verfügbar');
    return auth.sign(pkg,{secret:await exchangeSecret(),keyId:`${registerId()}:v1`});
  }
  async function verifyPackage(pkg){
    if(pkg?.format==='KC_EXCHANGE_PACKAGE')return{ok:false,code:'LEGACY_CHECKSUM_PACKAGE_BLOCKED'};
    const auth=root.KCBExchangeAuth;
    if(!auth)return{ok:false,code:'EXCHANGE_AUTH_UNAVAILABLE'};
    return auth.verify(pkg,{secret:await exchangeSecret(),allowedSchemas:['KCB-CONFIG-1','KCB-EVENT-1'],now:Date.now()});
  }
  function syncValidation(pkg){
    if(pkg?.format==='KC_EXCHANGE_PACKAGE')return['Unsicheres Legacy-Austauschpaket ohne kryptografische Herkunftsprüfung ist gesperrt'];
    const errors=root.KCBExchange?.validateEnvelope?root.KCBExchange.validateEnvelope(pkg,['KCB-CONFIG-1','KCB-EVENT-1']):['KCB-Exchange-Core nicht verfügbar'];
    if(pkg?.integrity?.algorithm!==root.KCBExchangeAuth?.AUTH_ALG)errors.push('Kryptografisches Integritätsverfahren nicht unterstützt');
    if(!verifiedPackages.has(String(pkg?.packageId||'')))errors.push('Kryptografische Herkunftsprüfung nicht bestätigt');
    let used=[];try{used=JSON.parse(root.localStorage.getItem(USED_KEY)||'[]')}catch{}
    if(used.includes(pkg?.packageId))errors.push('Paket bereits importiert');
    return errors;
  }
  function requireRuntime(){
    const needed=['buildPosExchangeSales','buildPosAdminChangeSet','encryptObject','decryptObject','downloadText','validatePosExchange'];
    const missing=needed.filter(name=>typeof root[name]!=='function');
    if(missing.length)throw new Error(`KCB-Runtime unvollständig: ${missing.join(', ')}`);
  }

  function patchRuntime(){
    try{
      requireRuntime();
      const originalImport=byId('importKCExchangeFile')?.onchange;
      if(typeof originalImport!=='function')throw new Error('KCB-Importhandler nicht verfügbar');

      root.validatePosExchange=syncValidation;

      const salesButton=byId('exportKCExchangeSales');
      if(!salesButton)throw new Error('KCB-Verkaufsexport fehlt');
      salesButton.onclick=async()=>{
        try{
          const password=root.prompt('Übertragungscode für die geschützte Austauschdatei:');
          if(!password||password.length<8){setStatus('Export abgebrochen: Übertragungscode muss mindestens 8 Zeichen haben.');return}
          const raw=root.buildPosExchangeSales();
          const pkg=await signPackage(raw);
          const encrypted=await root.encryptObject(pkg,password);
          root.downloadText(`${pkg.sourceId||registerId()}_Vorgaenge_${pkg.packageId.slice(0,8)}.kce`,JSON.stringify(encrypted),'application/octet-stream');
          setStatus(`Authentifiziert exportiert: ${pkg.packageId}`);
        }catch(error){setStatus(`Export abgelehnt: ${error.message||error}`)}
      };

      const adminButton=byId('exportAdminChanges');
      if(!adminButton)throw new Error('KCB-Adminexport fehlt');
      adminButton.onclick=async()=>{
        try{
          const changes=typeof root.adminChanges==='function'?root.adminChanges():[];
          if(!changes.length){setStatus('Keine Vor-Ort-Änderungen zum Export vorhanden.');return}
          const password=root.prompt('Übertragungscode für die geschützte Austauschdatei:');
          if(!password||password.length<8){setStatus('Export abgebrochen: Übertragungscode muss mindestens 8 Zeichen haben.');return}
          if(typeof root.appendAdminAudit==='function')root.appendAdminAudit('changeset-export','success',{message:`${changes.length} Änderung(en) · HMAC-authentifiziert`});
          const raw=root.buildPosAdminChangeSet();
          const pkg=await signPackage(raw);
          const encrypted=await root.encryptObject(pkg,password);
          root.downloadText(`${registerId()}_Konfiguration_${new Date().toISOString().slice(0,10)}_${pkg.packageId.slice(0,8)}.kcc`,JSON.stringify(encrypted),'application/octet-stream');
          const count=byId('adminChangeCount');if(count)count.textContent=`${changes.length} Änderung(en) geschützt + authentifiziert exportiert · Paket ${pkg.packageId.slice(0,8)}`;
          setStatus(`Authentifiziert exportiert: ${pkg.packageId}`);
        }catch(error){setStatus(`Export abgelehnt: ${error.message||error}`)}
      };

      const input=byId('importKCExchangeFile');
      input.onchange=async event=>{
        const file=event?.target?.files?.[0];if(!file)return;
        let packageId='';
        try{
          if(Number(file.size||0)>MAX_IMPORT_BYTES)throw new Error('Austauschdatei ist zu groß');
          let pkg=JSON.parse(await file.text());
          if(pkg?.format==='KC_ENCRYPTED_V1'){
            const password=root.prompt('Übertragungscode der geschützten Austauschdatei:');
            if(!password)throw new Error('Übertragungscode fehlt');
            try{pkg=await root.decryptObject(pkg,password)}catch{throw new Error('Übertragungscode falsch oder Datei beschädigt')}
          }
          const verification=await verifyPackage(pkg);
          if(!verification.ok)throw new Error(`Kryptografische Herkunftsprüfung fehlgeschlagen (${verification.code})`);
          packageId=String(pkg.packageId||'');verifiedPackages.add(packageId);
          const syntheticFile={name:file.name||'authenticated.kcb',size:JSON.stringify(pkg).length,text:async()=>JSON.stringify(pkg)};
          await originalImport({target:{files:[syntheticFile],value:''}});
        }catch(error){setStatus(`Abgelehnt: ${error.message||error}`)}
        finally{if(packageId)verifiedPackages.delete(packageId);if(event?.target)event.target.value=''}
      };

      state.ready=true;state.lastError=null;
      root.dispatchEvent?.(new root.CustomEvent('kc-kcb-auth-ready',{detail:{version:VERSION,algorithm:root.KCBExchangeAuth?.AUTH_ALG||null}}));
    }catch(error){
      state.ready=false;state.lastError=String(error?.message||error);
      setStatus(`KCB-Sicherheit gesperrt: ${state.lastError}`);
      console.error('KC KCB Exchange Auth konnte nicht aktiviert werden',error);
    }
  }

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',patchRuntime,{once:true});
  else queueMicrotask(patchRuntime);
})(typeof globalThis!=='undefined'?globalThis:window,document);
