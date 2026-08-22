(()=>{
  'use strict';
  const PROJECT='iddudrxuihdodnvejxcp';
  const API_URL=`https://${PROJECT}.supabase.co/functions/v1/kc-communication-api`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('de-DE'):'—';
  const msg=(t,type='info')=>window.KCMessageCore?.add(t,type);
  let loading=false,lastDashboard=null,lastHistory=null;

  async function api(action,extra={}){
    const auth=window.KCCommunicationAuth;
    const token=await auth?.getAccessToken?.();
    if(!token)throw new Error('Bitte zuerst bei KC Communication anmelden.');
    const led=document.getElementById('supabaseTrafficLed');if(led)led.className='led yellow';
    try{
      const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':auth.API_KEY,'Authorization':`Bearer ${token}`},body:JSON.stringify({action,...extra})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false)throw new Error(j.error||`HTTP ${r.status}`);
      return j;
    }finally{if(led)led.className='led yellow dim'}
  }

  function activeTab(){return document.querySelector('.tab.active')?.dataset?.tab||'dashboard'}
  function statusBadge(s){const ok=['provider_accepted','sent','delivered','opened'].includes(s),warn=['failed','dead_lettered'].includes(s);return `<span class="badge ${ok?'ok':warn?'warn':''}">${esc(s||'—')}</span>`}

  async function refreshDashboard(){
    const tab=activeTab();if(tab!=='dashboard'||loading)return;
    loading=true;
    try{
      const d=await api('dashboard');lastDashboard=d;
      const cards=[...document.querySelectorAll('#content .grid.kpis .card.kpi')];
      const connected=(d.programs||[]).filter(p=>p.status==='connected').length;
      const values=[d.kpis?.total||0,d.kpis?.sent||0,d.kpis?.failed||0,`${connected} / ${(d.programs||[]).length}`];
      cards.forEach((c,i)=>{const v=c.querySelector('.value');if(v&&i<values.length)v.textContent=String(values[i])});
      let live=document.getElementById('kcLiveDashboardCard');
      if(!live){live=document.createElement('section');live.id='kcLiveDashboardCard';live.className='card';live.style.marginTop='14px';document.getElementById('content')?.appendChild(live)}
      live.innerHTML=`<div class="section-title"><div><h2>Live-Systemstatus</h2><div class="muted">Direkt aus KC Communication / Supabase</div></div><button class="btn" id="kcRefreshLiveDashboard">Aktualisieren</button></div>
        <div class="grid kpis"><div class="card kpi"><div class="label">Queue</div><div class="value">${Number(d.queue?.queued||0)}</div><div class="muted">wartend</div></div><div class="card kpi"><div class="label">Retry</div><div class="value">${Number(d.queue?.retry||0)}</div><div class="muted">erneuter Versuch</div></div><div class="card kpi"><div class="label">Dead Letter</div><div class="value">${Number(d.queue?.deadLetter||0)}</div><div class="muted">manuell prüfen</div></div><div class="card kpi"><div class="label">Dispatcher</div><div class="value">${d.settings?.dispatch_enabled?'EIN':'AUS'}</div><div class="muted">globaler Versand</div></div></div>
        <div style="margin-top:14px"><strong>Letzte echte Aufträge</strong>${recentTable(d.recent||[])}</div>`;
      document.getElementById('kcRefreshLiveDashboard')?.addEventListener('click',refreshDashboard);
    }catch(e){
      if(window.KCCommunicationAuth?.user?.())msg(`Live-Dashboard: ${e.message}`,'warning');
      let live=document.getElementById('kcLiveDashboardCard');if(!live){live=document.createElement('section');live.id='kcLiveDashboardCard';live.className='card';live.style.marginTop='14px';document.getElementById('content')?.appendChild(live)}
      live.innerHTML='<div class="notification-bar warning">Live-Daten erst nach KC-Communication-Anmeldung verfügbar.</div>';
    }finally{loading=false}
  }

  function recentTable(items){return `<table style="margin-top:8px"><thead><tr><th>Zeit</th><th>Programm</th><th>Kanal</th><th>Status</th><th>Provider</th></tr></thead><tbody>${items.length?items.slice(0,10).map(x=>`<tr><td>${fmt(x.created_at)}</td><td>${esc(x.source_program)}</td><td>${esc(x.channel)}</td><td>${statusBadge(x.status)}</td><td>${esc(x.provider_id||'—')}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Noch keine zentralen Versandaufträge.</td></tr>'}</tbody></table>`}

  async function refreshHistory(){
    if(activeTab()!=='history'||loading)return;loading=true;
    try{
      const d=await api('history',{limit:250});lastHistory=d.items||[];
      const root=document.getElementById('content');if(!root)return;
      root.innerHTML=`<section class="card"><div class="section-title"><div><h2>Versandhistorie</h2><div class="muted">Echte zentrale Historie · bis zu 250 letzte Aufträge</div></div><button class="btn" id="kcRefreshHistory">Aktualisieren</button></div>${historyTable(lastHistory)}</section>`;
      document.getElementById('kcRefreshHistory')?.addEventListener('click',refreshHistory);
    }catch(e){if(window.KCCommunicationAuth?.user?.())msg(`Historie: ${e.message}`,'warning')}
    finally{loading=false}
  }

  function historyTable(items){return `<table><thead><tr><th>Zeit</th><th>ID</th><th>Programm</th><th>Kanal</th><th>Status</th><th>Provider</th><th>Fehler</th></tr></thead><tbody>${items.length?items.map(x=>`<tr><td>${fmt(x.created_at)}</td><td><small>${esc(x.id)}</small></td><td>${esc(x.source_program)}</td><td>${esc(x.channel)}</td><td>${statusBadge(x.status)}</td><td>${esc(x.provider_id||'—')}</td><td>${esc(x.error_code||'—')}</td></tr>`).join(''):'<tr><td colspan="7" class="muted">Noch keine zentralen Versandaufträge.</td></tr>'}</tbody></table>`}

  function refreshForTab(){setTimeout(()=>{const t=activeTab();if(t==='dashboard')refreshDashboard();if(t==='history')refreshHistory()},0)}
  document.addEventListener('click',e=>{if(e.target.closest('.tab'))refreshForTab()});
  document.addEventListener('kc-communication-auth-changed',refreshForTab);
  new MutationObserver(()=>{const t=activeTab();if(t==='dashboard'&&!document.getElementById('kcLiveDashboardCard'))refreshDashboard()}).observe(document.getElementById('content'),{childList:true});
  window.KCCommunicationLiveData={refreshDashboard,refreshHistory,get dashboard(){return lastDashboard},get history(){return lastHistory}};
  refreshForTab();
})();
