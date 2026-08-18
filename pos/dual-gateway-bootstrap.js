(function(root){
  'use strict';
  const VERSION='1.0.0';
  const A='https://kc-failover-gateway.ha-joko.workers.dev';
  const B_DEFAULT='https://kc-failover-gateway-b.netlify.app';
  const originalFetch=root.fetch?.bind(root);
  if(!originalFetch)return;
  const state={active:'A',aFailures:0,bFailures:0,aOpenUntil:0,lastSwitch:null,lastAOk:null,lastBOk:null,lastError:null};
  const now=()=>Date.now();
  const strip=s=>String(s||'').replace(/\/$/,'');
  function bUrl(){return strip(root.KC_DUAL_GATEWAY_B||root.KC_RUNTIME_FLAGS?.failoverGatewayB||B_DEFAULT)}
  function isGatewayA(url){try{return strip(new URL(String(url),root.location?.href).origin)===strip(A)}catch{return false}}
  function pathOf(url){const u=new URL(String(url),root.location?.href);return u.pathname+u.search}
  function timedFetch(url,init,timeout=5000){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);const signal=init?.signal;let abortForward;try{if(signal){if(signal.aborted)ctl.abort();else{abortForward=()=>ctl.abort();signal.addEventListener('abort',abortForward,{once:true})}}return originalFetch(url,{...init,signal:ctl.signal}).finally(()=>{clearTimeout(timer);if(signal&&abortForward)signal.removeEventListener('abort',abortForward)})}catch(e){clearTimeout(timer);throw e}}
  function success(provider){state.active=provider;state.lastError=null;if(provider==='A'){state.aFailures=0;state.aOpenUntil=0;state.lastAOk=new Date().toISOString()}else{state.bFailures=0;state.lastBOk=new Date().toISOString()}}
  function failure(provider,error){state.lastError=error instanceof Error?error.message:String(error);if(provider==='A'){state.aFailures++;if(state.aFailures>=2)state.aOpenUntil=now()+30000}else state.bFailures++}
  async function attempt(provider,path,init){const base=provider==='A'?A:bUrl();if(!base)throw new Error(`GATEWAY_${provider}_UNCONFIGURED`);const r=await timedFetch(base+path,init,provider==='A'?4500:6000);if(!r.ok&&![207,409].includes(r.status))throw new Error(`GATEWAY_${provider}_HTTP_${r.status}`);success(provider);return r}
  async function dualFetch(input,init){
    if(!isGatewayA(input))return originalFetch(input,init);
    const path=pathOf(input),aAllowed=now()>=state.aOpenUntil;
    if(aAllowed){try{return await attempt('A',path,init)}catch(error){failure('A',error)}}
    try{const r=await attempt('B',path,init);if(state.active!=='B'){state.active='B';state.lastSwitch=new Date().toISOString()}return r}catch(error){failure('B',error);throw new AggregateError([new Error(state.lastError||'Gateway B failed')],'KC_DUAL_GATEWAY_UNAVAILABLE')}
  }
  async function probe(){
    try{const r=await timedFetch(A+'/',{method:'GET',cache:'no-store'},3500);if(r.ok){const was=state.active;success('A');if(was!=='A')state.lastSwitch=new Date().toISOString();return true}}catch(error){failure('A',error)}
    return false;
  }
  root.fetch=dualFetch;
  root.KCDualGateway=Object.freeze({VERSION,primary:A,secondary:bUrl,status:()=>({...state,secondary:bUrl()}),probe});
  root.addEventListener?.('online',()=>probe().catch(()=>{}));
  root.setInterval?.(()=>{if(state.active==='B'||state.aOpenUntil>now())probe().catch(()=>{})},15000);
})(typeof globalThis!=='undefined'?globalThis:window);
