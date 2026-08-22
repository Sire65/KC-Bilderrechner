import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const admin=()=>createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const envAny=(names:string[])=>{for(const n of names){const v=Deno.env.get(n);if(v)return v}return ''};
const now=()=>new Date().toISOString();
const safeText=(v:any,max=2000)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
const calcBackoff=(retry:number,base:number,max:number)=>Math.min(max,Math.max(base,base*Math.pow(2,Math.max(0,retry-1))));

async function addEvent(db:any,requestId:string,eventType:string,provider:string|null=null,providerMessageId:string|null=null,detail:any={}){
  await db.from('kc_communication_delivery_events').insert({request_id:requestId,event_type:eventType,provider,provider_message_id:providerMessageId,detail});
}
async function getSettings(db:any){
  const {data}=await db.from('kc_communication_settings').select('*').eq('id','global').maybeSingle();
  return data||{dispatch_enabled:false,retry_base_seconds:30,retry_max_seconds:3600,dead_letter_after:5};
}
function pushSubscriptionFromRow(row:any){return {endpoint:row.endpoint,expirationTime:row.expiration_time??null,keys:{p256dh:row.p256dh,auth:row.auth_key}}}
async function sendPush(db:any,reqRow:any,payload:any){
  const pub=envAny(['KC_COMMUNICATION_VAPID_PUBLIC_KEY','KC_DP_VAPID_PUBLIC_KEY']);
  const priv=envAny(['KC_COMMUNICATION_VAPID_PRIVATE_KEY','KC_DP_VAPID_PRIVATE_KEY']);
  const subject=envAny(['KC_COMMUNICATION_VAPID_SUBJECT','KC_DP_VAPID_SUBJECT'])||'mailto:admin@koecheclub-werne.de';
  if(!pub||!priv) throw new Error('VAPID_SERVER_CONFIG_MISSING');
  webpush.setVapidDetails(subject,pub,priv);
  const refs=Array.isArray(reqRow.recipient_refs)?reqRow.recipient_refs:[];
  const userIds=refs.map((x:any)=>String(x?.userId||x?.user_id||x?.authUserId||'')).filter(Boolean).slice(0,100);
  if(!userIds.length) throw new Error('PUSH_USER_RECIPIENT_MISSING');
  const {data:subs,error}=await db.from('kc_communication_push_devices').select('id,user_id,endpoint,p256dh,auth_key,expiration_time').eq('active',true).in('user_id',userIds);
  if(error) throw error;
  if(!(subs||[]).length) throw new Error('PUSH_SUBSCRIPTION_NOT_FOUND');
  let sent=0,failed=0,lastError='';
  for(const s of subs||[]){
    try{await webpush.sendNotification(pushSubscriptionFromRow(s),JSON.stringify(payload),{TTL:21600,urgency:reqRow.priority==='critical'?'high':'normal'});sent++}
    catch(e){failed++;lastError=String((e as any)?.statusCode||(e as Error).message||'push_error');if([404,410].includes(Number((e as any)?.statusCode)))await db.from('kc_communication_push_devices').update({active:false,updated_at:now()}).eq('id',s.id)}
  }
  if(!sent) throw new Error(`PUSH_ALL_FAILED:${lastError}`);
  return {provider:'web-push',providerMessageId:`push:${reqRow.id}`,accepted:sent,failed};
}
async function sendResend(reqRow:any,payload:any){
  const key=envAny(['KC_COMMUNICATION_RESEND_API_KEY','KC_DP_RESEND_API_KEY','RESEND_API_KEY']);
  const from=envAny(['KC_COMMUNICATION_EMAIL_FROM','KC_DP_EMAIL_FROM']);
  if(!key) throw new Error('RESEND_API_KEY_MISSING');
  if(!from) throw new Error('EMAIL_FROM_MISSING');
  const to=(Array.isArray(reqRow.recipient_refs)?reqRow.recipient_refs:[]).map((x:any)=>String(x?.email||x?.address||x)).filter(x=>x.includes('@')).slice(0,50);
  if(!to.length) throw new Error('EMAIL_RECIPIENT_MISSING');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject:safeText(payload.subject||'KC Communication Test',300),text:safeText(payload.text||payload.body||'',10000)})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`RESEND_HTTP_${r.status}:${safeText((data as any)?.message||'',300)}`);
  return {provider:'resend',providerMessageId:String((data as any)?.id||''),accepted:to.length,failed:0};
}
async function sendBrevo(reqRow:any,payload:any){
  const key=envAny(['KC_COMMUNICATION_BREVO_API_KEY','KC_DP_BREVO_API_KEY']);
  const from=envAny(['KC_COMMUNICATION_EMAIL_FROM','KC_DP_EMAIL_FROM']);
  if(!key) throw new Error('BREVO_API_KEY_MISSING');
  if(!from||!from.includes('@')) throw new Error('EMAIL_FROM_MISSING');
  const to=(Array.isArray(reqRow.recipient_refs)?reqRow.recipient_refs:[]).map((x:any)=>String(x?.email||x?.address||x)).filter(x=>x.includes('@')).slice(0,50);
  if(!to.length) throw new Error('EMAIL_RECIPIENT_MISSING');
  const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':key,'Content-Type':'application/json'},body:JSON.stringify({sender:{email:from},to:to.map(email=>({email})),subject:safeText(payload.subject||'KC Communication Test',300),textContent:safeText(payload.text||payload.body||'',10000)})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`BREVO_HTTP_${r.status}:${safeText((data as any)?.message||'',300)}`);
  return {provider:'brevo',providerMessageId:String((data as any)?.messageId||''),accepted:to.length,failed:0};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json({error:'POST erforderlich'},405);
  const db=admin();let body:any={};try{body=await req.json()}catch{return json({error:'Ungültiges JSON'},400)}
  const requestId=String(body.requestId||'');if(!requestId)return json({error:'requestId fehlt'},400);
  const {data:r,error}=await db.from('kc_communication_requests').select('*').eq('id',requestId).maybeSingle();if(error||!r)return json({error:'Versandauftrag nicht gefunden'},404);
  const settings=await getSettings(db);const isExplicitTest=body.testOnly===true&&r.audit_meta?.testOnly===true;
  if(!settings.dispatch_enabled&&!isExplicitTest)return json({error:'Globaler Versand ist gesperrt',code:'DISPATCH_DISABLED'},423);
  if(['sent','delivered','opened'].includes(r.status))return json({ok:true,duplicateSafe:true,status:r.status,requestId:r.id});
  const attempt=Number(r.retry_count||0)+1;
  await db.from('kc_communication_requests').update({status:'processing',locked_at:now(),processed_at:now()}).eq('id',r.id);
  await addEvent(db,r.id,'processing',null,null,{attempt,testOnly:isExplicitTest});
  try{
    const vars=r.variables||{};const payload={title:safeText(vars.title||'KC Communication',200),body:safeText(vars.body||vars.text||'Testnachricht',4000),text:safeText(vars.text||vars.body||'Testnachricht',10000),subject:safeText(vars.subject||vars.title||'KC Communication Test',300),data:{requestId:r.id,correlationId:r.correlation_id,channel:r.channel,testOnly:isExplicitTest}};
    let result:any;if(r.channel==='push')result=await sendPush(db,r,payload);else if(r.channel==='email')result=String(r.provider_id||body.provider||'resend')==='brevo'?await sendBrevo(r,payload):await sendResend(r,payload);else throw new Error('CHANNEL_ADAPTER_NOT_READY');
    await db.from('kc_communication_requests').update({status:'sent',provider_id:result.provider,provider_message_id:result.providerMessageId||null,retry_count:attempt-1,error_code:null,error_detail:null,sent_at:now(),locked_at:null}).eq('id',r.id);
    await addEvent(db,r.id,'sent',result.provider,result.providerMessageId||null,{accepted:result.accepted,failed:result.failed,testOnly:isExplicitTest});
    return json({ok:true,requestId:r.id,status:'sent',provider:result.provider,accepted:result.accepted,failed:result.failed,testOnly:isExplicitTest});
  }catch(e){
    const msg=safeText((e as Error).message||'dispatch_error',800);const dead=attempt>=Number(settings.dead_letter_after||5);const delay=calcBackoff(attempt,Number(settings.retry_base_seconds||30),Number(settings.retry_max_seconds||3600));
    await db.from('kc_communication_requests').update({status:dead?'dead_lettered':'retry_scheduled',retry_count:attempt,error_code:msg.split(':')[0],error_detail:msg,next_attempt_at:dead?null:new Date(Date.now()+delay*1000).toISOString(),dead_lettered_at:dead?now():null,locked_at:null}).eq('id',r.id);
    await addEvent(db,r.id,dead?'dead_lettered':'retry_scheduled',null,null,{attempt,delaySeconds:dead?null:delay,error:msg});
    return json({ok:false,requestId:r.id,status:dead?'dead_lettered':'retry_scheduled',attempt,error:msg,nextAttemptSeconds:dead?null:delay},502);
  }
});