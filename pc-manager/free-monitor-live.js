'use strict';
(function(){
  const DATA_URL='https://raw.githubusercontent.com/Sire65/KC-Bilderrechner/monitor-free-usage-data/pc-manager/free-monitor-live.json';
  const STORE='kc_free_monitor_v1';
  const HIST='kc_free_monitor_history_v1';
  const SET='kc_free_monitor_settings_v1';
  const LAST_LIVE='kc_free_monitor_last_live_v1';
  const DAY=86400000;
  let running=false;

  function parseJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}}
  function due(){const t=new Date(localStorage.getItem(LAST_LIVE)||0).getTime();return !Number.isFinite(t)||Date.now()-t>=DAY}
  function dailyEnabled(){return parseJSON(SET,{dailyAuto:true}).dailyAuto!==false}
  function applySnapshot(doc){
    if(!doc||doc.version!==1||!Array.isArray(doc.providers))throw new Error('Ungültiger Free-Monitor-Snapshot');
    const providers=parseJSON(STORE,[]),history=parseJSON(HIST,[]);
    if(!Array.isArray(providers)||!providers.length)return false;
    const at=doc.collectedAt||new Date().toISOString();
    for(const snap of doc.providers){
      const p=providers.find(x=>x.id===snap.providerId);if(!p)continue;
      if(snap.blocked!==undefined)p.blocked=!!snap.blocked;
      if(snap.at)p.lastUpdate=snap.at;
      p.lastSource=snap.source||'GitHub Free-Snapshot';
      if(snap.note)p.notes=snap.note;
      const values=snap.metrics||{},histMetrics={};
      for(const m of p.metrics||[]){
        if(Object.prototype.hasOwnProperty.call(values,m.id)&&Number.isFinite(Number(values[m.id]))){m.used=Number(values[m.id]);histMetrics[m.id]=m.used}
        if(m.id==='credits'&&snap.blocked!==undefined)m.blocked=!!snap.blocked;
      }
      if(Object.keys(histMetrics).length)history.unshift({at:snap.at||at,providerId:p.id,metrics:histMetrics,source:snap.source||'GitHub Free-Snapshot'});
    }
    localStorage.setItem(STORE,JSON.stringify(providers));
    localStorage.setItem(HIST,JSON.stringify(history.slice(0,1200)));
    localStorage.setItem(LAST_LIVE,new Date().toISOString());
    return true;
  }
  async function refreshLive(reason='manual'){
    if(running)return false;running=true;
    try{
      const r=await fetch(DATA_URL,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if(!r.ok)throw new Error(`GitHub Snapshot HTTP ${r.status}`);
      const changed=applySnapshot(await r.json());
      if(changed){sessionStorage.setItem('kc_free_monitor_live_note',`Snapshot aktualisiert (${reason})`);location.reload();}
      return changed;
    }catch(err){
      sessionStorage.setItem('kc_free_monitor_live_note',`Snapshot nicht aktualisiert: ${err.message}`);
      const pill=document.createElement('span');pill.className='pill warn';pill.textContent='Live-Snapshot nicht erreichbar';document.getElementById('overallPills')?.appendChild(pill);
      return false;
    }finally{running=false}
  }
  function init(){
    const banner=document.querySelector('.banner');
    if(banner)banner.innerHTML='<strong>0-Credit-Regel:</strong> Die Manager-Prüfung lädt höchstens einmal täglich bzw. auf manuellen Klick einen kleinen read-only Snapshot von GitHub. Sie startet keine Netlify-Deployments, Functions, Cloudflare Worker, Supabase Edge Functions oder Datenbankabfragen. Provider-Erfassung erfolgt getrennt und read-only.';
    const note=sessionStorage.getItem('kc_free_monitor_live_note');
    if(note){sessionStorage.removeItem('kc_free_monitor_live_note');const pill=document.createElement('span');pill.className='pill ok';pill.textContent=note;document.getElementById('overallPills')?.appendChild(pill)}
    document.getElementById('localRefresh')?.addEventListener('click',()=>refreshLive('manuell'),{capture:true});
    if(dailyEnabled()&&due())setTimeout(()=>refreshLive('täglich'),350);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.KCFreeMonitorLive={refresh:refreshLive,dataUrl:DATA_URL};
})();
