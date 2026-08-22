import { createClient } from 'npm:@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const channels=new Set(['push','email','sms','whatsapp','auto']);

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'POST erforderlich'},405);

  const url=Deno.env.get('SUPABASE_URL')||'';
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!service) return json({error:'Serverkonfiguration unvollständig'},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});

  let body:any={};
  try{body=await req.json()}catch{return json({error:'Ungültiges JSON'},400)}
  const action=String(body.action||'status');

  if(action==='status'){
    const [{data:providers},{data:programs},{count:queued}]=await Promise.all([
      admin.from('kc_communication_providers').select('id,channel,provider_key,display_name,status,direction,enabled,public_config,source_system,source_reference').order('channel'),
      admin.from('kc_communication_programs').select('id,display_name,status,allowed_channels,permissions').order('display_name'),
      admin.from('kc_communication_requests').select('id',{count:'exact',head:true}).eq('status','queued')
    ]);
    return json({ok:true,dispatchEnabled:false,providers:providers||[],programs:programs||[],queued:queued||0});
  }

  if(action==='dryRun'){
    const source=String(body.sourceProgram||'').trim();
    const channel=String(body.channel||'').trim();
    if(!source||!channels.has(channel)) return json({error:'Quellprogramm oder Kanal ungültig'},400);
    const {data:program}=await admin.from('kc_communication_programs').select('id,status,allowed_channels,permissions').eq('id',source).maybeSingle();
    if(!program) return json({error:'Programm nicht registriert'},404);
    if(!Array.isArray(program.allowed_channels)||(!program.allowed_channels.includes(channel)&&channel!=='auto')) return json({error:'Kanal für Programm nicht freigegeben'},403);
    const recipients=Array.isArray(body.recipientRefs)?body.recipientRefs.slice(0,100):[];
    const {data,error}=await admin.from('kc_communication_requests').insert({
      source_program:source,
      channel,
      template_id:body.templateId?String(body.templateId):null,
      recipient_refs:recipients,
      variables:body.variables&&typeof body.variables==='object'?body.variables:{},
      priority:['low','normal','high','critical'].includes(String(body.priority))?String(body.priority):'normal',
      scheduled_for:body.scheduledFor||null,
      fallback_channel:body.fallbackChannel?String(body.fallbackChannel):null,
      status:'queued',
      audit_meta:{dryRun:true,dispatchBlocked:true,createdVia:'kc-communication-api'}
    }).select('id,status,created_at').single();
    if(error) return json({error:error.message},400);
    return json({ok:true,dryRun:true,dispatchEnabled:false,request:data});
  }

  return json({error:'Unbekannte Aktion'},400);
});
