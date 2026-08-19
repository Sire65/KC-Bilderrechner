/* Zentraler Umschalter für Hinweise, die nur während der Erprobung sichtbar sein dürfen. */
window.KC_RUNTIME_FLAGS=Object.freeze({
  testPhaseToolGuidance:true
});

/*
 * Audit-Härtung: Die Candidate-index.html bindet einige vorhandene Schutzmodule
 * derzeit nicht direkt ein. Dieser Loader nutzt den bereits vor app.js geladenen
 * runtime-flags-Einstieg, ohne main oder das Produktivdeployment zu verändern.
 *
 * Transaction-Integrity, KCASH2-Authentifizierung und Dual-Gateway werden parser-
 * synchron geladen. Die im <head> mit defer eingebundene NotificationCore sieht
 * damit den Digest-Core schon bei ihrer Initialisierung. Der Local Vault startet
 * nach der initialen POS-Hydrierung an DOMContentLoaded und migriert vorhandene
 * kc_*-Werte anschließend in den verschlüsselten IndexedDB-Vault.
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

  if(!root.KCTransactionIntegrity)parserSync('../cores/transaction-integrity-core/transaction-integrity-core.js','kcTransactionIntegrityBootstrap');
  if(!root.KCCashTransferAuth)parserSync('../cores/cash-transfer-auth-core/cash-transfer-auth-core.js','kcCashTransferAuthBootstrap');
  if(!root.KCDualGateway)parserSync('dual-gateway-bootstrap.js','kcDualGatewayBootstrap');

  const loadVault=()=>{if(!root.KCStorageVault)appendScript('local-vault-bootstrap.js','kcLocalVaultBootstrap')};
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',loadVault,{once:true});else loadVault();
})(window,document);
