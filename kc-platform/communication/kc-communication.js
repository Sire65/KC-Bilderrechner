(()=>{
  "use strict";

  const state={
    providers:{
      push:{name:"Web Push / VAPID",status:"configured",accountId:"",sender:"KC Communication",secretPresent:true},
      email:{name:"Brevo / SMTP",status:"configured",accountId:"",sender:"",secretPresent:true},
      sms:{name:"Nicht eingerichtet",status:"off",accountId:"",sender:"",secretPresent:false},
      whatsapp:{name:"Nicht eingerichtet",status:"off",accountId:"",sender:"",secretPresent:false}
    },
    programs:[
      {id:"kc-dp2",name:"KC DP2",status:"planned",channels:["push","email"],requests:0,errors:0},
      {id:"kc-verwaltung",name:"KC Verwaltung",status:"planned",channels:["push","email"],requests:0,errors:0},
      {id:"kc-academy",name:"KC Futura Academy",status:"planned",channels:["push","email"],requests:0,errors:0},
      {id:"kc-money-butler",name:"KC Money Butler",status:"planned",channels:["email"],requests:0,errors:0},
      {id:"kc-bilderrechner",name:"KC Bilderrechner",status:"local",channels:["email"],requests:0,errors:0},
      {id:"kc-wm",name:"KC WM Präsentation",status:"planned",channels:["email"],requests:0,errors:0}
    ],
    templates:[
      {id:"system_test",name:"Systemtest",channels:["push","email","sms","whatsapp"]},
      {id:"dp2_shift_changed",name:"DP2 – Dienst geändert",channels:["push","email"]}
    ],
    history:[]
  };

  const channelNames={push:"Push",email:"E-Mail",sms:"SMS",whatsapp:"WhatsApp"};
  const content=document.getElementById("content");

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const providerStatus=p=>p.status==="configured"?'<span class="badge ok">● eingerichtet</span>':p.status==="error"?'<span class="badge warn">● Fehler</span>':'<span class="badge off">○ nicht eingerichtet</span>';
  const programStatus=s=>s==="connected"?'<span class="badge ok">● verbunden</span>':s==="local"?'<span class="badge warn">● lokal vorhanden</span>':'<span class="badge off">○ geplant</span>';

  function renderDashboard(){
    const total=state.history.length;
    const sent=state.history.filter(x=>x.status==="sent").length;
    const failed=state.history.filter(x=>x.status==="failed").length;
    const connected=state.programs.filter(x=>x.status==="connected").length;
    content.innerHTML=`
      <section class="grid kpis">
        ${kpi("Versandaufträge",total,"gesamt")}
        ${kpi("Erfolgreich",sent,"zugestellt / angenommen")}
        ${kpi("Fehler",failed,"prüfen")}
        ${kpi("Programme",connected+" / "+state.programs.length,"verbunden")}
      </section>
      <section class="grid two" style="margin-top:14px">
        <div class="card"><div class="section-title"><h2>Versand nach Kanal</h2><span class="muted">Live aus Historie</span></div><div class="chart-placeholder">Diagramm-Schnittstelle vorbereitet</div></div>
        <div class="card"><div class="section-title"><h2>Providerstatus</h2><span class="muted">zentrale Dienste</span></div>${Object.entries(state.providers).map(([k,p])=>`<div class="provider-card" style="padding:9px 0;border-bottom:1px solid var(--border)"><div><strong>${channelNames[k]}</strong><div class="muted">${esc(p.name)}</div></div>${providerStatus(p)}</div>`).join("")}</div>
      </section>
      <section class="card" style="margin-top:14px"><div class="section-title"><h2>Letzte Aktivitäten</h2><button class="btn" data-open="history">Historie öffnen</button></div>${historyTable(state.history.slice(-8).reverse())}</section>`;
  }

  function kpi(label,value,sub){return `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="muted">${esc(sub)}</div></div>`}

  function renderChannel(channel){
    const p=state.providers[channel];
    content.innerHTML=`
      <section class="grid two">
        <div class="card">
          <div class="section-title"><div><h2>${channelNames[channel]}</h2><div class="muted">Provider und Zugangsdaten zentral verwalten</div></div>${providerStatus(p)}</div>
          <div class="form-grid">
            ${field("Provider *","providerName",p.name,true)}
            ${field("Account-/Projekt-ID","accountId",p.accountId)}
            ${field("Absender / Sender-ID","sender",p.sender)}
            ${secretField("API-Key / Secret",p.secretPresent)}
            <div class="field full"><label>Standardregeln</label><select id="defaultRule"><option>Sofort versenden</option><option>Ruhezeiten beachten</option><option>Fallback aktivieren</option></select></div>
          </div>
          <div class="toolbar" style="margin-top:14px"><div class="muted">Secrets werden nie an Fachprogramme zurückgegeben.</div><div><button class="btn" id="testProvider">Verbindung testen</button> <button class="btn primary" id="saveProvider">Speichern</button></div></div>
        </div>
        <div class="card">
          <h2>Versandauftrag testen</h2>
          <div class="form-grid">
            ${field("Quellprogramm *","testSource","kc-dp2",true)}
            ${field("Empfänger-ID *","testRecipient","test-user",true)}
            <div class="field full"><label>Vorlage</label><select id="testTemplate">${state.templates.filter(t=>t.channels.includes(channel)).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select></div>
            <div class="field full"><label>Nachricht</label><textarea id="testMessage">KC Communication Test – ${channelNames[channel]}</textarea></div>
          </div>
          <div class="toolbar" style="margin-top:14px"><span class="muted">Test erzeugt einen protokollierten Auftrag; echter Provider-Versand folgt erst nach Adapterfreigabe.</span><button class="btn primary" id="createTest">Testauftrag erzeugen</button></div>
        </div>
      </section>`;
    bindChannel(channel);
  }

  function field(label,id,value,required=false){return `<div class="field"><label for="${id}">${esc(label)}${required?' <span class="req">*</span>':''}</label><input id="${id}" value="${esc(value)}"></div>`}
  function secretField(label,present){return `<div class="field"><label>${esc(label)} <span class="req">*</span></label><input value="${present?'••••••••••••':''}" type="password" readonly><div class="muted">${present?'Secret hinterlegt':'noch kein Secret hinterlegt'}</div></div>`}

  function bindChannel(channel){
    document.getElementById("saveProvider")?.addEventListener("click",()=>{
      const p=state.providers[channel]; p.name=document.getElementById("providerName").value.trim(); p.accountId=document.getElementById("accountId").value.trim(); p.sender=document.getElementById("sender").value.trim(); p.status=p.name?"configured":"off"; renderChannel(channel);
    });
    document.getElementById("testProvider")?.addEventListener("click",()=>alert("Provider-Testadapter ist vorbereitet. Echte Verbindungstests werden mit dem jeweiligen Server-Adapter aktiviert."));
    document.getElementById("createTest")?.addEventListener("click",()=>{
      const item={id:"KCC-"+Date.now(),at:new Date().toISOString(),source:document.getElementById("testSource").value.trim(),recipient:document.getElementById("testRecipient").value.trim(),channel,template:document.getElementById("testTemplate").value,status:"queued"};
      state.history.push(item); renderChannel(channel); alert("Testauftrag "+item.id+" wurde lokal protokolliert.");
    });
  }

  function renderTemplates(){
    content.innerHTML=`<section class="card"><div class="section-title"><div><h2>Vorlagen</h2><div class="muted">Zentrale Vorlagen statt Kopien in jedem Fachprogramm</div></div><button class="btn primary">Neue Vorlage</button></div><table><thead><tr><th>ID</th><th>Name</th><th>Kanäle</th><th>Status</th></tr></thead><tbody>${state.templates.map(t=>`<tr><td>${esc(t.id)}</td><td>${esc(t.name)}</td><td>${t.channels.map(c=>channelNames[c]).join(", ")}</td><td><span class="badge ok">aktiv</span></td></tr>`).join("")}</tbody></table></section>`;
  }

  function renderPrograms(){
    content.innerHTML=`<section class="card"><div class="section-title"><div><h2>Programme & Schnittstellen</h2><div class="muted">Jedes KC-Programm erhält dieselbe Communication-Schnittstelle</div></div><button class="btn primary">Programm registrieren</button></div><table><thead><tr><th>Programm</th><th>Programm-ID</th><th>Status</th><th>Erlaubte Kanäle</th><th>Aufträge</th><th>Fehler</th></tr></thead><tbody>${state.programs.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.id)}</td><td>${programStatus(p.status)}</td><td>${p.channels.map(c=>channelNames[c]).join(", ")}</td><td>${p.requests}</td><td>${p.errors}</td></tr>`).join("")}</tbody></table></section>`;
  }

  function historyTable(items){return `<table><thead><tr><th>Zeit</th><th>ID</th><th>Programm</th><th>Kanal</th><th>Empfänger</th><th>Status</th></tr></thead><tbody>${items.length?items.map(x=>`<tr><td>${new Date(x.at).toLocaleString("de-DE")}</td><td>${esc(x.id)}</td><td>${esc(x.source)}</td><td>${esc(channelNames[x.channel]||x.channel)}</td><td>${esc(x.recipient)}</td><td><span class="badge ${x.status==="failed"?'warn':x.status==="sent"?'ok':''}">${esc(x.status)}</span></td></tr>`).join(""):'<tr><td colspan="6" class="muted">Noch keine Versandaufträge protokolliert.</td></tr>'}</tbody></table>`}
  function renderHistory(){content.innerHTML=`<section class="card"><div class="section-title"><div><h2>Versandhistorie</h2><div class="muted">Einheitliche Nachverfolgung aller Kanäle und Programme</div></div><button class="btn">Export vorbereiten</button></div>${historyTable([...state.history].reverse())}</section>`}

  function renderTestcenter(){content.innerHTML=`<section class="grid two"><div class="card"><h2>Systemtests</h2><table><tbody><tr><td>Communication Contract</td><td><span class="badge ok">bereit</span></td></tr><tr><td>Provideradapter</td><td><span class="badge warn">Stub</span></td></tr><tr><td>Programm-Authentisierung</td><td><span class="badge warn">Entwurf</span></td></tr><tr><td>Audit / Historie</td><td><span class="badge ok">Grundlage aktiv</span></td></tr></tbody></table></div><div class="card"><h2>Regression</h2><p class="muted">Hier werden später alle gemeinsamen Tests für Push, E-Mail, SMS, WhatsApp und die KC-Programmschnittstelle zentral ausgeführt.</p><button class="btn primary" id="runTests">Grundtests ausführen</button><div id="testResult" style="margin-top:12px"></div></div></section>`;document.getElementById("runTests")?.addEventListener("click",()=>document.getElementById("testResult").innerHTML='<span class="badge ok">✓ UI-/Contract-Grundtests erfolgreich</span>')}

  function openTab(tab){
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    if(tab==="dashboard")renderDashboard(); else if(["push","email","sms","whatsapp"].includes(tab))renderChannel(tab); else if(tab==="templates")renderTemplates(); else if(tab==="programs")renderPrograms(); else if(tab==="history")renderHistory(); else renderTestcenter();
  }

  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.tab)));
  document.addEventListener("click",e=>{const t=e.target.closest("[data-open]");if(t)openTab(t.dataset.open)});
  window.KCCommunication={version:"1.0.0-dev",state,openTab,createRequest:req=>{const item={id:"KCC-"+Date.now(),at:new Date().toISOString(),status:"queued",...req};state.history.push(item);return {...item};}};
  openTab("dashboard");
})();
