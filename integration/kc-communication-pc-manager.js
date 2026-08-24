// KC PC Manager -> KC Communication integration adapter.
// No provider secrets are stored here. Pass the authenticated Supabase client used by PC Manager.
export function createPcManagerCommunication(supabaseClient) {
  if (!supabaseClient?.functions?.invoke) throw new Error('Supabase client fehlt');
  const SOURCE='kc-pc-manager';
  async function send(eventKey, recipients, variables={}, options={}) {
    const body={
      sourceProgram:SOURCE,
      eventKey,
      recipients:Array.isArray(recipients)?recipients:[],
      variables:{programName:'KC PC Manager',eventName:eventKey,...variables},
      priority:options.priority||'normal',
      testOnly:options.testOnly===true,
      correlationId:options.correlationId||`pc-manager-${Date.now()}`
    };
    const {data,error}=await supabaseClient.functions.invoke('kc-communication-router',{body});
    if(error) throw error;
    return data;
  }
  return {
    sourceProgram:SOURCE,
    send,
    test:(recipients,message='KC PC Manager Kommunikationstest')=>send('communication_test',recipients,{message},{testOnly:true}),
    warning:(recipients,message)=>send('system_warning',recipients,{message},{priority:'high'}),
    error:(recipients,message)=>send('system_error',recipients,{message},{priority:'critical'})
  };
}
