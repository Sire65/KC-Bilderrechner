(()=>{
  'use strict';
  const PROJECT='iddudrxuihdodnvejxcp';
  const BASE=`https://${PROJECT}.supabase.co/functions/v1`;
  const msg=(t,type='info')=>window.KCMessageCore?.add(t,type);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function call(slug,body){
    const auth=window.KCCommunicationAuth;const token=await auth?.getAccessToken?.();
    if(!token)throw new Error('Bitte zuerst bei KC Communication anmelden.');
    const r=await fetch(`${BASE}/${slug}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':auth.API_KEY,'Authorization':`Bearer ${token}`},body:JSON.stringify(body||{})});
    const j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw new Error(j.error||j.errorCode||`HTTP ${r.status}`);return j;
  }
  async function providerHealth(){
    const root=document.getElementById('kcEmailProviderReadiness');if(!root)return;
    root.innerHTML='<div class="muted">Providerstatus wird geprüft…</div>';
    try{
      const j=await call('kc-communication-provider-health',{}),rows=(j.providers||[]).filter(x=>x.channel==='email');
      root.innerHTML=rows.map(p=>`<div class="provider-card" style="padding:10px 0;border-bottom:1px solid var(--border)"><div><strong>${esc(p.provider||'E-Mail')}</strong><div class="muted">API-Key: ${p.configured?'vorhanden':'fehlt'} · Absender: ${p.emailFromConfigured?'vorhanden':'fehlt'}</div></div><span class="badge ${p.outboundReady?'ok':'warn'}">${p.outboundReady?'versandbereit':'noch nicht bereit'}</span></div>`).join('')||'<div class="muted">Keine E-Mail-Provider gefunden.</div>';
    }catch(e){root.innerHTML=`<div class="notification-bar warning">${esc(e.message)}</div>`}
  }
  async function sendTest(){
    const to=document.getElementById('kcEmailTestRecipient')?.value.trim()||'';
    const subject=document.getElementById('kcEmailTestSubject')?.value.trim()||'';
    const text=document.getElementById('kcEmailTestBody')?.value.trim()||'';
    const provider=document.getElementById('kcEmailTestProvider')?.value||'resend';
    if(!/^\S+@\S+\.\S+$/.test(to))throw new Error('Bitte eine gültige Test-E-Mail-Adresse eingeben.');
    if(!subject||!text)throw new Error('Betreff und Nachricht sind Pflichtfelder.');
    if(!confirm(`Testmail wirklich senden?\n\nEmpfänger: ${to}\nProvider: ${provider}\nBetreff: ${subject}`))return;
    const idempotency=`kcc-email-test:${provider}:${to.toLowerCase()}:${Date.now()}`;
    const created=await call('kc-communication-api',{action:'createTestRequest',sourceProgram:'kc-communication-system',channel:'email',recipientRefs:[{email:to}],variables:{subject,text,title:subject,body:text},priority:'normal',idempotencyKey:idempotency,correlationId:crypto.randomUUID(),testOnly:true,clientMeta:{ui:'email-test-ui'}});
    const requestId=created.request?.id;if(!requestId)throw new Error('Testauftrag konnte nicht angelegt werden.');
    const out=await call('kc-communication-dispatch',{requestId,testOnly:true,provider});
    msg(`Testmail wurde über ${out.provider||provider} an den Provider übergeben.`,'success');
    window.KCCommunicationLiveData?.refreshDashboard?.();
    window.KCCommunicationLiveData?.refreshHistory?.();
    const result=document.getElementById('kcEmailTestResult');if(result)result.innerHTML=`<span class="badge ok">✓ gesendet</span> <span class="muted">Auftrag ${esc(requestId)}</span>`;
  }
  function inject(){
    if(!document.querySelector('.tab.active[data-tab="email"]'))return;
    if(document.getElementById('kcEmailProfessionalCard'))return;
    const grid=document.querySelector('#content .grid.two');if(!grid)return;
    const card=document.createElement('section');card.className='card';card.id='kcEmailProfessionalCard';card.style.marginTop='14px';
    card.innerHTML=`<div class="section-title"><div><h2>E-Mail – Provider & Systemtest</h2><div class="muted">Isolierter Test über KC Communication · kein Fachprogramm angebunden</div></div><button class="btn" id="kcRefreshEmailProvider">Provider prüfen</button></div><div id="kcEmailProviderReadiness"></div><hr style="margin:16px 0;border:0;border-top:1px solid var(--border)"><div class="form-grid"><div class="field"><label>Provider <span class="req">*</span></label><select id="kcEmailTestProvider"><option value="resend">Resend</option><option value="brevo">Brevo</option></select></div><div class="field"><label>Test-Empfänger <span class="req">*</span></label><input id="kcEmailTestRecipient" type="email" placeholder="name@beispiel.de"></div><div class="field full"><label>Betreff <span class="req">*</span></label><input id="kcEmailTestSubject" value="KC Communication – E-Mail TEST"></div><div class="field full"><label>Nachricht <span class="req">*</span></label><textarea id="kcEmailTestBody" rows="5">Erster zentraler E-Mail-Test über KC Communication.</textarea></div></div><div class="toolbar" style="margin-top:14px"><div id="kcEmailTestResult" class="muted">Noch keine Testmail gesendet.</div><button class="btn primary" id="kcSendEmailTest">Testmail senden</button></div>`;
    grid.insertAdjacentElement('afterend',card);
    document.getElementById('kcRefreshEmailProvider')?.addEventListener('click',providerHealth);
    document.getElementById('kcSendEmailTest')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;try{await sendTest()}catch(err){msg(err.message,'error')}finally{b.disabled=false}});
    providerHealth();
  }
  document.addEventListener('click',e=>{if(e.target.closest('.tab'))setTimeout(inject,0)});
  document.addEventListener('kc-communication-auth-changed',()=>setTimeout(()=>{inject();providerHealth()},0));
  new MutationObserver(inject).observe(document.getElementById('content'),{childList:true,subtree:true});
  inject();
})();
