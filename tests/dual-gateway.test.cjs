const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync('pos/dual-gateway-bootstrap.js','utf8');
function response(status=200,body={status:'OK'}){return {ok:status>=200&&status<300,status,json:async()=>body}}
async function run(mode){
  const calls=[];
  const ctx={
    globalThis:null,
    location:{href:'https://example.test/pos/',pathname:'/pos/'},
    KC_RUNTIME_FLAGS:{failoverGatewayB:'https://gateway-b.example'},
    setTimeout,clearTimeout,setInterval:()=>0,addEventListener:()=>{},
    AbortController,AggregateError,URL,Date,console,
    fetch:async(url)=>{calls.push(String(url));if(String(url).includes('workers.dev')){if(mode==='a-down'||mode==='both-down')throw new Error('A_DOWN');return response(200)}if(String(url).includes('gateway-b.example')){if(mode==='both-down')throw new Error('B_DOWN');return response(200)}throw new Error('unexpected '+url)}
  };ctx.globalThis=ctx;
  vm.createContext(ctx);vm.runInContext(code,ctx);
  let error=null,result=null;try{result=await ctx.fetch('https://kc-failover-gateway.ha-joko.workers.dev/sync/reconcile',{method:'POST',body:'{}'})}catch(e){error=e}
  return {ctx,calls,result,error};
}
(async()=>{
  let r=await run('healthy');assert.equal(r.result.status,200);assert.equal(r.calls.length,1);assert.match(r.calls[0],/workers\.dev/);
  r=await run('a-down');assert.equal(r.result.status,200);assert.equal(r.calls.length,2);assert.match(r.calls[1],/gateway-b\.example/);assert.equal(r.ctx.KCDualGateway.status().active,'B');
  r=await run('both-down');assert.ok(r.error);assert.equal(r.calls.length,2);assert.match(String(r.error.message),/KC_DUAL_GATEWAY_UNAVAILABLE/);
  console.log(JSON.stringify({status:'PASS',primary:true,secondaryFailover:true,doubleFailureFallsToQueue:true}));
})().catch(e=>{console.error(e);process.exit(1)});
