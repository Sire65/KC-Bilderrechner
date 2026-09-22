(function(root,doc){
  'use strict';
  const VERSION='1.0.0';
  const APP='app.js?build=0.31.3.6-r11-vault1';
  const TRAINING='training-demo-bridge.js?build=0.27.0-vault1';

  function hint(message){
    const node=doc.getElementById('systemHint');
    if(node)node.textContent=message;
  }
  function load(src,id){
    return new Promise((resolve,reject)=>{
      if(doc.getElementById(id)){resolve(true);return;}
      const script=doc.createElement('script');
      script.id=id;
      script.src=src;
      script.async=false;
      script.onload=()=>resolve(true);
      script.onerror=()=>reject(new Error(`SCRIPT_LOAD_FAILED:${src}`));
      doc.body.appendChild(script);
    });
  }
  async function start(){
    const vault=root.KCStorageVault;
    if(!vault?.ready)throw new Error('LOCAL_VAULT_NOT_AVAILABLE');
    await vault.ready;
    const audit=typeof vault.audit==='function'?await vault.audit():null;
    if(audit?.keyExtractable===true)throw new Error('LOCAL_VAULT_KEY_EXTRACTABLE');
    if(Array.isArray(audit?.plaintextLocalStorageKeys)&&audit.plaintextLocalStorageKeys.length)throw new Error('LOCAL_VAULT_PLAINTEXT_KEYS');
    await load(APP,'kcPosAppAfterVault');
    await load(TRAINING,'kcPosTrainingAfterVault');
    root.KCVaultAppLoader=Object.freeze({VERSION,ready:true});
  }

  start().catch(error=>{
    console.error('KC sicherer Kassenstart fehlgeschlagen',error);
    root.KC_RUNTIME_SECURITY_BLOCKED=true;
    hint('Sicherer lokaler Speicher nicht verfügbar · Kasse gesperrt');
    root.KCVaultAppLoader=Object.freeze({VERSION,ready:false,error:String(error?.message||error)});
  });
})(window,document);
