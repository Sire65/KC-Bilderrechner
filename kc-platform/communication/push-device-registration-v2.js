(()=>{
  'use strict';
  const PROJECT='iddudrxuihdodnvejxcp';
  const DEVICES_URL=`https://${PROJECT}.supabase.co/functions/v1/kc-communication-push-devices`;
  const msg=(t,type='info')=>window.KCMessageCore?.add(t,type);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setTraffic=active=>{
    const state=window.KCCommunication?.state;
    if(state?.connections?.supabase)state.connections.supabase.traffic=active;
    const led=document.getElementById('supabaseTrafficLed');
    if(led)led.className=`led yellow${active?'':' dim'}`;
  };
  function b64ToUint8(base64){const pad='='.repeat((4-base64.length%4)%4),s=(base64+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
  async function api(body){
    const token=await window.KCCommunicationAuth?.getAccessToken?.();
    if(!token)throw new Error('Bitte zuerst bei KC Communication anmelden.');
    setTraffic(true);
    try{
      const r=await fetch(DEVICES_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false)throw new Error(j.error||j.errorCode||`HTTP ${r.status}`);
      return j;
    }finally{setTraffic(false)}
  }
  async function registerDevice(){
    if(!window.isSecureContext)throw new Error('Push-Geräte können nur über HTTPS registriert werden.');
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('Dieser Browser unterstützt Web Push nicht.');
    if(!window.KCCommunicationAuth?.user?.()){window.KCCommunicationAuth?.openDialog?.();throw new Error('Bitte zuerst bei KC Communication anmelden.');}
    if(Notification.permission==='denied')throw new Error('Benachrichtigungen sind im Browser blockiert. Bitte für diese Seite wieder erlauben.');
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Benachrichtigungen wurden nicht erlaubt.');
    msg('Push-Gerät wird neu registriert…','info');
    const reg=await navigator.serviceWorker.register('./kc-communication-sw.js',{scope:'./',updateViaCache:'none'});
    await navigator.serviceWorker.ready;
    const cfg=await api({action:'config'}),vapid=cfg.vapidPublicKey;
    if(!vapid)throw new Error('VAPID-Schlüssel fehlt.');
    let sub=await reg.pushManager.getSubscription();
    if(sub){try{await sub.unsubscribe()}catch{}sub=null}
    sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8(vapid)});
    await api({action:'register',subscription:sub.toJSON(),userAgent:navigator.userAgent});
    msg('Dieses Gerät ist jetzt direkt bei KC Communication registriert.','success');
    await loadDevices();
  }
  async function loadDevices(){
    const root=document.getElementById('kcPushDevices');if(!root)return;
    if(!window.KCCommunicationAuth?.user?.()){root.innerHTML='<div class="notification-bar warning">Bitte zuerst oben bei KC Communication anmelden.</div>';return}
    root.innerHTML='<div class="muted">Geräte werden geladen…</div>';
    try{
      const j=await api({action:'list'}),devices=j.devices||[];
      root.innerHTML=devices.length?`<table><thead><tr><th>Gerät</th><th>Status</th><th>Zuletzt aktualisiert</th><th>Aktion</th></tr></thead><tbody>${devices.map(d=>`<tr><td><strong>${esc(d.label)}</strong><div class="muted">${esc(d.endpointHint)}</div></td><td><span class="badge ${d.active?'ok':'off'}">${d.active?'aktiv':'inaktiv'}</span></td><td>${d.updatedAt?new Date(d.updatedAt).toLocaleString('de-DE'):'—'}</td><td>${d.active?`<button class="btn" data-device-action="deactivate" data-device-id="${esc(d.id)}">Deaktivieren</button> <button class="btn primary" data-device-action="test" data-device-id="${esc(d.id)}">Test an dieses Gerät</button>`:`<button class="btn danger" data-device-action="delete" data-device-id="${esc(d.id)}">Löschen</button>`}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Noch keine KC-Communication-Push-Geräte registriert.</div>';
    }catch(e){root.innerHTML=`<div class="notification-bar warning">${esc(e.message)}</div>`}
  }
  async function deviceAction(btn){
    const action=btn.dataset.deviceAction,id=btn.dataset.deviceId;if(!action||!id)return;
    if(action==='delete'&&!confirm('Dieses inaktive Push-Gerät wirklich löschen?'))return;
    if(action==='deactivate'&&!confirm('Dieses Push-Gerät wirklich deaktivieren?'))return;
    btn.disabled=true;
    try{
      if(action==='test'){
        msg('Echter KC-Communication-Push-Test wird gesendet…','info');
        await api({action:'test-self',deviceId:id,title:'KC Communication – TEST',message:'Erster zentraler Push-Test erfolgreich.'});
        msg('Push wurde vom Provider angenommen.','success');
      }else{
        await api({action,id});msg(action==='delete'?'Push-Gerät gelöscht.':'Push-Gerät deaktiviert.','success');await loadDevices();
      }
    }catch(e){msg(e.message,'error')}finally{btn.disabled=false}
  }
  function inject(){
    if(!document.querySelector('.tab.active[data-tab="push"]'))return;
    if(document.getElementById('kcPushRegistrationCard'))return;
    const first=document.querySelector('#content .grid.two');if(!first)return;
    const card=document.createElement('section');card.className='card';card.id='kcPushRegistrationCard';card.style.marginTop='14px';
    card.innerHTML=`<div class="section-title"><div><h2>Push-Geräte</h2><div class="muted">Eigenständige KC-Communication-Registrierung · keine DP2-Abhängigkeit</div></div><button class="btn primary" id="registerThisPushDevice">Dieses Gerät für Push anmelden</button></div><div class="muted" style="margin-bottom:12px">Die Registrierung erfolgt direkt für den aktuell bei KC Communication angemeldeten Benutzer. Beim erneuten Registrieren wird bewusst eine frische Browser-Subscription erzeugt.</div><div id="kcPushDevices"></div>`;
    first.insertAdjacentElement('afterend',card);
    document.getElementById('registerThisPushDevice')?.addEventListener('click',async()=>{try{await registerDevice()}catch(e){msg(e.message,'error')}});
    card.addEventListener('click',e=>{const b=e.target.closest('[data-device-action]');if(b)deviceAction(b)});
    loadDevices();
  }
  new MutationObserver(inject).observe(document.getElementById('content'),{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(inject,0));
  document.addEventListener('kc-communication-auth-changed',()=>setTimeout(()=>{inject();loadDevices()},0));
  inject();
})();
