(()=>{
  "use strict";

  const ENDPOINT="https://iddudrxuihdodnvejxcp.supabase.co/functions/v1/kc-communication-one-shot-push-test";
  let running=false;

  const msg=(text,type="info")=>window.KCMessageCore?.add(text,type);
  const setTraffic=active=>{
    const state=window.KCCommunication?.state;
    if(state?.connections?.supabase) state.connections.supabase.traffic=active;
    const led=document.getElementById("supabaseTrafficLed");
    if(led) led.className=`led yellow${active?'':' dim'}`;
  };

  async function sendFirstPush(){
    if(running) return;
    const ok=window.confirm("Ersten echten Push-Test jetzt an das registrierte Android-Handy senden?\n\nEs wird genau eine Nachricht gesendet. Wiederholtes Auslösen erzeugt keine zweite Nachricht.");
    if(!ok){msg("Push-Test wurde abgebrochen.","info");return;}

    running=true;
    const btn=document.getElementById("firstRealPushBtn");
    if(btn){btn.disabled=true;btn.textContent="Push wird gesendet …";}
    setTraffic(true);
    msg("Echter Push-Test an das Android-Handy wird gesendet.","info");

    try{
      const res=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:"KCC_FIRST_PUSH"})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok) throw new Error(data.errorCode||data.error||`HTTP ${res.status}`);

      const status=document.getElementById("firstRealPushResult");
      if(data.alreadySent){
        if(status) status.innerHTML='<span class="badge ok">✓ bereits zuvor gesendet</span>';
        msg("Der erste Push-Test wurde bereits zuvor erfolgreich gesendet; es wurde keine zweite Nachricht erzeugt.","success");
      }else{
        if(status) status.innerHTML='<span class="badge ok">✓ vom Push-Provider angenommen</span>';
        msg("Push-Nachricht wurde erfolgreich versendet.","success");
      }
    }catch(err){
      const status=document.getElementById("firstRealPushResult");
      if(status) status.innerHTML=`<span class="badge warn">✕ Versand fehlgeschlagen</span><div class="muted" style="margin-top:6px">${String(err.message||err)}</div>`;
      msg(`Push-Test fehlgeschlagen: ${String(err.message||err)}`,"error");
    }finally{
      setTraffic(false);
      running=false;
      if(btn){btn.disabled=false;btn.textContent="Ersten echten Push senden";}
    }
  }

  function inject(){
    const active=document.querySelector('.tab.active')?.dataset?.tab;
    const content=document.getElementById("content");
    if(!content||active!=="push"||document.getElementById("firstRealPushCard")) return;

    const card=document.createElement("section");
    card.id="firstRealPushCard";
    card.className="card";
    card.style.marginTop="14px";
    card.innerHTML=`
      <div class="section-title">
        <div>
          <h2>Erster echter Push-Test</h2>
          <div class="muted">Ziel: registriertes Android-Handy · One-Shot-Schutz aktiv</div>
        </div>
        <span class="badge warn">TEST</span>
      </div>
      <p><strong>Nachricht:</strong> KC Communication – TEST<br>Erster zentraler Push-Test erfolgreich.</p>
      <div class="toolbar">
        <div id="firstRealPushResult" class="muted">Noch nicht gesendet.</div>
        <button id="firstRealPushBtn" class="btn primary" type="button">Ersten echten Push senden</button>
      </div>`;
    content.appendChild(card);
    document.getElementById("firstRealPushBtn")?.addEventListener("click",sendFirstPush);
  }

  document.addEventListener("click",e=>{
    if(e.target.closest(".tab")) setTimeout(inject,0);
  });
  new MutationObserver(()=>inject()).observe(document.getElementById("content"),{childList:true,subtree:false});
  inject();
})();
