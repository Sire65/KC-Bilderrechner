import { createClient } from 'npm:@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'GET,OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='GET') return json({error:'GET erforderlich'},405);
  const url=Deno.env.get('SUPABASE_URL')||'';
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!service) return json({error:'Serverkonfiguration unvollständig'},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const [{data:providers,error:pErr},{data:programs,error:gErr},{count:queued,error:qErr}]=await Promise.all([
    admin.from('kc_communication_providers').select('id,channel,provider_key,display_name,status,direction,enabled,source_system,source_reference,public_config,updated_at').order('channel').order('id'),
    admin.from('kc_communication_programs').select('id,display_name,status,allowed_channels,permissions,updated_at').order('display_name'),
    admin.from('kc_communication_requests').select('id',{count:'exact',head:true}).eq('status','queued')
  ]);
  if(pErr||gErr||qErr) return json({error:'KC Communication Status nicht abrufbar'},500);
  return json({ok:true,service:'KC Communication',version:'1.0.0-dev',providers:providers||[],programs:programs||[],queued:queued||0,dispatchEnabled:false,note:'Kein KC-Fachprogramm ist angebunden; Provider-Secrets werden nicht ausgegeben.'});
});
