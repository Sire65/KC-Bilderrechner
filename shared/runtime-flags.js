/* Zentraler Umschalter für Hinweise, die nur während der Erprobung sichtbar sein dürfen. */
window.KC_RUNTIME_FLAGS=Object.freeze({
  testPhaseToolGuidance:true
});

/*
 * Audit-Härtung: Die Candidate-index.html bindet einige vorhandene Schutzmodule
 * derzeit nicht direkt ein. Dieser Loader nutzt den bereits vor app.js geladenen
 * runtime-flags-Einstieg, ohne main oder das Produktivdeployment zu verändern.
 *
 * DOM-Safety, Transaction-Integrity, KCASH2-Authentifizierung,
 * KCB-Austauschauthentifizierung und Dual-Gateway werden parser-synchron geladen.
 * DOM-Safety kapselt dabei alle nachfolgenden innerHTML-Zuweisungen vor dem ersten
 * POS-Render und entfernt ausführbare Tags/Attribute, unsichere URL-Schemata und
 * nicht freigegebene Inline-Styles. Die im <head> mit defer eingebundene
 * NotificationCore sieht den Digest-Core schon bei ihrer Initialisierung. Der
 * Local Vault startet nach der initialen POS-Hydrierung an DOMContentLoaded und
 * migriert vorhandene kc_*-Werte anschließend in den verschlüsselten IndexedDB-Vault.
 */
(function(root,doc){
  'use strict';
  if(!root||!doc)return;
  let isPos=false;try{isPos=/(^|\/)pos(\/|$)/i.test(root.location?.pathname||'')}catch{}
  if(!isPos)return;

  function appendScript(src,id){
    if(doc.getElementById(id))return;
    const script=doc.createElement('script');script.src=src;script.id=id;script.async=false;script.dataset.kcAuditBootstrap='true';doc.head.appendChild(script);
  }
  function parserSync(src,id){
    if(doc.getElementById(id))return;
    if(doc.readyState==='loading'&&typeof doc.write==='function')doc.write(`<script id="${id}" src="${src}" data-kc-audit-bootstrap="true"><\/script>`);
    else appendScript(src,id);
  }

  const exchangeGuardIds=['exportKCExchangeSales','exportAdminChanges','selectKCExchangeImport','importKCExchangeFile'];
  function exchangeGuard(event){
    if(root.KCBExchangeAuthPOS?.ready===true)return;
    event.preventDefault?.();event.stopImmediatePropagation?.();
    const status=doc.getElementById('kcExchangePosStatus');if(status)status.textContent='KCB-Sicherheitsmodul noch nicht bereit – Austausch bleibt gesperrt.';
  }
  for(const id of exchangeGuardIds){
    const node=doc.getElementById(id);if(!node)continue;
    node.addEventListener(id==='importKCExchangeFile'?'change':'click',exchangeGuard,true);
  }

  if(!root.KCDomSafety)parserSync('../cores/dom-safety-core/dom-safety-core.js','kcDomSafetyBootstrap');
  if(root.KCDomSafety?.installed!==true)root.KC_RUNTIME_SECURITY_BLOCKED=true;
  if(!root.KCTransactionIntegrity)parserSync('../cores/transaction-integrity-core/transaction-integrity-core.js','kcTransactionIntegrityBootstrap');
  if(!root.KCCashTransferAuth)parserSync('../cores/cash-transfer-auth-core/cash-transfer-auth-core.js','kcCashTransferAuthBootstrap');
  if(!root.KCBExchangeAuth)parserSync('../exchange-core-v31/exchange-auth.js','kcExchangeAuthBootstrap');
  parserSync('kcb-exchange-auth-bootstrap.js','kcExchangeAuthPosBootstrap');
  if(!root.KCDualGateway)parserSync('dual-gateway-bootstrap.js','kcDualGatewayBootstrap');

  const loadVault=()=>{if(!root.KCStorageVault)appendScript('local-vault-bootstrap.js','kcLocalVaultBootstrap')};
  const verifyExchangeBootstrap=()=>{
    if(root.KCBExchangeAuthPOS?.ready===true)return;
    for(const id of exchangeGuardIds){const node=doc.getElementById(id);if(node)node.disabled=true}
    const status=doc.getElementById('kcExchangePosStatus');if(status)status.textContent='KCB-Austausch aus Sicherheitsgründen gesperrt: Authentifizierungsmodul nicht aktiv.';
  };
  if(doc.readyState==='loading'){
    doc.addEventListener('DOMContentLoaded',loadVault,{once:true});
    doc.addEventListener('DOMContentLoaded',verifyExchangeBootstrap,{once:true});
  }else{
    loadVault();verifyExchangeBootstrap();
  }
})(window,document);
