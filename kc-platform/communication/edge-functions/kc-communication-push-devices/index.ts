import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const now=()=>new Date().toISOString();
const labelFromUa=(ua:string)=>/Android/i.test(ua)?'Android-Handy':/iPhone|iPad/i.test(ua)?'Apple-Gerät':/Windows/i.test(ua)?'Windows-PC':/Macintosh/i.test(ua)?'Mac':'Browser-Gerät';

Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'POST erforderlich'},405);

  const url=Deno.env.get('SUPABASE_URL')||'';
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!anon||!service) return json({error:'Serverkonfiguration unvollständig'},503);

  const auth=req.headers.get('Authorization')||'';
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user) return json({error:'Anmeldung erforderlich'},401);

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let body:any={}; try{body=await req.json()}catch{}
  const action=String(body.action||'list');

  if(action==='config'){
    const publicKey=Deno.env.get('KCC_VAPID_PUBLIC_KEY')||Deno.env.get('KC_DP_VAPID_PUBLIC_KEY')||'';
    if(!publicKey) return json({error:'VAPID-Schlüssel fehlt'},503);
    return json({ok:true,vapidPublicKey:publicKey});
  }

  if(action==='list'){
    const {data,error}=await admin.from('kc_communication_push_devices')
      .select('id,endpoint,user_agent,device_label,active,created_at,updated_at,last_seen_at')
      .eq('user_id',user.id).order('updated_at',{ascending:false});
    if(error) return json({error:error.message},400);
    const devices=(data||[]).map((d:any)=>({
      id:d.id,
      label:d.device_label||labelFromUa(d.user_agent||''),
      active:d.active===true,
      status:d.active===true?'active':'inactive',
      updatedAt:d.updated_at,
      createdAt:d.created_at,
      lastSeenAt:d.last_seen_at,
      endpointHint:String(d.endpoint||'').slice(0,38)+'…'
    }));
    return json({ok:true,devices});
  }

  if(action==='register'){
    const sub=body.subscription||{};
    const endpoint=String(sub.endpoint||'');
    const p256dh=String(sub.keys?.p256dh||'');
    const authKey=String(sub.keys?.auth||'');
    if(!endpoint||!p256dh||!authKey) return json({error:'Push-Subscription unvollständig'},400);
    const {data:existing,error:existingError}=await admin.from('kc_communication_push_devices').select('id,user_id').eq('endpoint',endpoint).maybeSingle();
    if(existingError) return json({error:existingError.message},400);
    if(existing&&existing.user_id!==user.id) return json({error:'Diese Push-Subscription gehört bereits zu einem anderen Benutzer.'},409);
    const ua=String(body.userAgent||'').slice(0,1000);
    const row={
      user_id:user.id,endpoint,p256dh,auth_key:authKey,
      expiration_time:Number.isFinite(Number(sub.expirationTime))?Number(sub.expirationTime):null,
      user_agent:ua,device_label:String(body.deviceLabel||labelFromUa(ua)).slice(0,120),
      active:true,last_seen_at:now(),updated_at:now()
    };
    const {data,error}=await admin.from('kc_communication_push_devices').upsert(row,{onConflict:'endpoint'}).select('id,device_label,active,updated_at').single();
    if(error) return json({error:error.message},400);
    return json({ok:true,device:{id:data.id,label:data.device_label,active:data.active,updatedAt:data.updated_at}});
  }

  if(action==='deactivate'||action==='delete'){
    const id=String(body.id||'');
    if(!id) return json({error:'Geräte-ID fehlt'},400);
    const {data:owned,error:ownedError}=await admin.from('kc_communication_push_devices').select('id').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(ownedError) return json({error:ownedError.message},400);
    if(!owned) return json({error:'Gerät nicht gefunden'},404);
    if(action==='deactivate'){
      const {error}=await admin.from('kc_communication_push_devices').update({active:false,updated_at:now()}).eq('id',id).eq('user_id',user.id);
      return error?json({error:error.message},400):json({ok:true,status:'inactive'});
    }
    const {error}=await admin.from('kc_communication_push_devices').delete().eq('id',id).eq('user_id',user.id);
    return error?json({error:error.message},400):json({ok:true,deleted:true});
  }

  if(action==='test-self'){
    const publicKey=Deno.env.get('KCC_VAPID_PUBLIC_KEY')||Deno.env.get('KC_DP_VAPID_PUBLIC_KEY')||'';
    const privateKey=Deno.env.get('KCC_VAPID_PRIVATE_KEY')||Deno.env.get('KC_DP_VAPID_PRIVATE_KEY')||'';
    const subject=Deno.env.get('KCC_VAPID_SUBJECT')||Deno.env.get('KC_DP_VAPID_SUBJECT')||'mailto:admin@koecheclub-werne.de';
    if(!publicKey||!privateKey) return json({error:'VAPID-Serverkonfiguration unvollständig'},503);
    let q=admin.from('kc_communication_push_devices').select('id,endpoint,p256dh,auth_key').eq('user_id',user.id).eq('active',true);
    if(body.deviceId) q=q.eq('id',String(body.deviceId));
    const {data:devices,error}=await q.order('updated_at',{ascending:false}).limit(1);
    if(error) return json({error:error.message},400);
    const device=devices?.[0];
    if(!device) return json({error:'Kein aktives KC-Communication-Push-Gerät vorhanden'},404);
    webpush.setVapidDetails(subject,publicKey,privateKey);
    const payload=JSON.stringify({
      title:String(body.title||'KC Communication – TEST').slice(0,120),
      body:String(body.message||'Erster zentraler Push-Test erfolgreich.').slice(0,500),
      data:{source:'kc-communication',test:true,at:now()}
    });
    try{
      const result=await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}},payload,{TTL:60,urgency:'normal'} as any);
      await admin.from('kc_communication_push_devices').update({last_seen_at:now(),updated_at:now()}).eq('id',device.id);
      return json({ok:true,status:'sent',providerStatusCode:result.statusCode});
    }catch(e:any){
      const code=Number(e?.statusCode||0);
      if(code===404||code===410) await admin.from('kc_communication_push_devices').update({active:false,updated_at:now()}).eq('id',device.id);
      return json({ok:false,error:'Push-Versand fehlgeschlagen',errorCode:code||'WEBPUSH_ERROR'},code>=400&&code<600?code:502);
    }
  }

  return json({error:'Unbekannte Aktion'},400);
});
