/* Zentraler Umschalter für Hinweise, die nur während der Erprobung sichtbar sein dürfen. */
window.KC_RUNTIME_FLAGS=Object.freeze({
  testPhaseToolGuidance:true
});

/*
 * Audit-Härtung: Die Candidate-index.html bindet die vorhandenen Failover-/Vault-
 * Bootstrapdateien derzeit nicht direkt ein. Dieser Loader nutzt den bereits vor
 * app.js geladenen runtime-flags-Einstieg, ohne main oder das Produktivdeployment
 * zu verändern.
 *
 * Dual-Gateway wird parser-synchron geladen, damit fetch() bereits vor den
 * nachfolgenden POS-Skripten geschützt/umschaltbar ist. Der Local Vault startet
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

  if(!root.KCDualGateway){
    if(doc.readyState==='loading'&&typeof doc.write==='function'){
      doc.write('<script id="kcDualGatewayBootstrap" src="dual-gateway-bootstrap.js" data-kc-audit-bootstrap="true"><\/script>');
    }else appendScript('dual-gateway-bootstrap.js','kcDualGatewayBootstrap');
  }

  const loadVault=()=>{if(!root.KCStorageVault)appendScript('local-vault-bootstrap.js','kcLocalVaultBootstrap')};
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',loadVault,{once:true});else loadVault();
})(window,document);
