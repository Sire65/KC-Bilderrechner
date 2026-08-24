// KC Bilderrechner -> KC Communication integration adapter.
// No provider secrets are stored in this repository.
export function createKcCommunication(supabaseClient) {
  if (!supabaseClient?.functions?.invoke) throw new Error('Supabase client fehlt');
  const SOURCE='kc-bilderrechner';
  return {
    async send(eventKey, recipients, variables={}, options={}) {
      const {data,error}=await supabaseClient.functions.invoke('kc-communication-router',{body:{sourceProgram:SOURCE,eventKey,recipients:Array.isArray(recipients)?recipients:[],variables,priority:options.priority||'normal',testOnly:options.testOnly===true,correlationId:options.correlationId||`bilder-${Date.now()}`}});
      if(error) throw error; return data;
    }
  };
}
