(()=>{
  'use strict';
  const PROJECT='iddudrxuihdodnvejxcp';
  const PUSH_URL=`https://${PROJECT}.supabase.co/functions/v1/kc-dp-push`;
  const DEVICES_URL=`https://${PROJECT}.supabase.co/functions/v1/kc-communication-push-devices`;
  const msg=(t,type='info')=>window.KCMessageCore?.add(t,type);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function authToken(){
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!key.includes(PROJECT)||!key.includes('auth-token')) continue;
      try{
        const raw=JSON.parse(localStorage.getItem(key)||'null');
        const token=raw?.access_token||raw?.currentSession?.access_token||raw?.session?.access_token;
        if(token)return token;
      }catch{}
    }
    return null;
  }
  function b64ToUint8(base64){
    const pad='='.repeat((4-base64.length%4)%4),s=(base64+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(s),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
  }
  async function getVapid(){
    const r=await fetch(PUSH_URL,{cache:'no-store'}); const j=await r.json();
    if(!r.ok||!j.vapidPublicKey)throw new Error(j.error||'VAPID-Schlüssel fehlt'); return j.vapidPublicKey;
  }
  async function api(url,body){
    const token=authToken(); if(!token)throw new Error('Bitte auf diesem Gerät einmal bei KC DP2/Supabase anmelden.');
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({})); if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`); return j;
  }
  async function registerDevice(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Dieser Browser unterstützt Web Push nicht.');
    if(Notification.permission==='denied')throw new Error('Benachrichtigungen sind im Browser blockiert. Bitte für diese Seite wieder erlauben.');
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Benachrichtigungen wurden nicht erlaubt.');
    msg('Push-Gerät wird registriert…','info');
    window.KCCommunication?.state?.connections?.supabase&&(window.KCCommunication.state.connections.supabase.traffic=true);
    const reg=await navigator.serviceWorker.register('./kc-communication-sw.js',{scope:'./'});
    await navigator.serviceWorker.ready;
    const vapid=await getVapid();
    let sub=await reg.pushManager.getSubscription();
    if(sub){try{await sub.unsubscribe()}catch{}}
    sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8(vapid)});
    await api(PUSH_URL,{action:'subscribe',orgId:'KC_WERNE',projectId:'KC_DP',subscription:sub.toJSON(),userAgent:navigator.userAgent});
    msg('Push-Gerät erfolgreich registriert.','success');
    await loadDevices();
  }
  async function loadDevices(){
    const root=document.getElementById('kcPushDevices'); if(!root)return;
    const token=authToken();
    if(!token){root.innerHTML='<div class="muted">Geräteliste verfügbar, sobald auf diesem Gerät eine KC-DP2/Supabase-Anmeldung vorhanden ist.</div>';return;}
    root.innerHTML='<div class="muted">Geräte werden geladen…</div>';
    try{
      const j=await api(DEVICES_URL,{action:'list'}),devices=j.devices||[];
      root.innerHTML=devices.length?`<table><thead><tr><th>Gerät</th><th>Status</th><th>Zuletzt aktualisiert</th><th>Aktion</th></tr></thead><tbody>${devices.map(d=>`<tr><td><strong>${esc(d.label)}</strong><div class="muted">${esc(d.endpointHint)}</div></td><td><span class="badge ${d.active?'ok':'off'}">${d.active?'aktiv':'inaktiv'}</span></td><td>${d.updatedAt?new Date(d.updatedAt).toLocaleString('de-DE'):'—'}</td><td>${d.active?`<button class="btn" data-device-action="deactivate" data-device-id="${esc(d.id)}">Deaktivieren</button>`:`<button class="btn danger" data-device-action="delete" data-device-id="${esc(d.id)}">Löschen</button>`}</td></tr>`).join('')}</tbody></table>`:'<div class="muted">Noch keine Push-Geräte registriert.</div>';
    }catch(e){root.innerHTML=`<div class="notification-bar warning">${esc(e.message)}</div>`;}
  }
  async function deviceAction(btn){
    const action=btn.dataset.deviceAction,id=btn.dataset.deviceId;if(!action||!id)return;
    if(action==='delete'&&!confirm('Dieses inaktive Push-Gerät wirklich löschen?'))return;
    if(action==='deactivate'&&!confirm('Dieses Push-Gerät wirklich deaktivieren?'))return;
    try{await api(DEVICES_URL,{action,id});msg(action==='delete'?'Push-Gerät gelöscht.':'Push-Gerät deaktiviert.','success');await loadDevices()}catch(e){msg(e.message,'error')}
  }
  function inject(){
    if(!document.querySelector('.tab.active[data-tab="push"]'))return;
    if(document.getElementById('kcPushRegistrationCard'))return;
    const first=document.querySelector('#content .grid.two'); if(!first)return;
    const card=document.createElement('section');card.className='card';card.id='kcPushRegistrationCard';card.style.marginTop='14px';
    card.innerHTML=`<div class="section-title"><div><h2>Push-Geräte</h2><div class="muted">Dieses Handy/Tablet/PC sicher für KC Push registrieren</div></div><button class="btn primary" id="registerThisPushDevice">Dieses Gerät für Push anmelden</button></div><div class="muted" style="margin-bottom:12px">Der Browser fragt beim ersten Mal nach der Erlaubnis für Benachrichtigungen. Die Registrierung wird dem aktuell angemeldeten KC-Benutzer zugeordnet.</div><div id="kcPushDevices"></div>`;
    first.insertAdjacentElement('afterend',card);
    document.getElementById('registerThisPushDevice')?.addEventListener('click',async()=>{try{await registerDevice()}catch(e){msg(e.message,'error')}});
    card.addEventListener('click',e=>{const b=e.target.closest('[data-device-action]');if(b)deviceAction(b)});
    loadDevices();
  }
  new MutationObserver(inject).observe(document.getElementById('content'),{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(inject,0));
  inject();
})();
