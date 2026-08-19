'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KCFreeMonitorCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DAY=86400000;
  const DEFAULT_THRESHOLDS={warn:50,danger:75,critical:90};

  function num(v,fallback=null){
    const n=Number(v);
    return Number.isFinite(n)?n:fallback;
  }
  function clamp(v,min=0,max=100){return Math.min(max,Math.max(min,v));}
  function percent(used,limit){
    used=num(used);limit=num(limit);
    if(used===null||limit===null||limit<=0)return null;
    return clamp(used/limit*100,0,999999);
  }
  function remaining(used,limit){
    used=num(used);limit=num(limit);
    if(used===null||limit===null)return null;
    return Math.max(0,limit-used);
  }
  function riskFromPercent(pct,thresholds=DEFAULT_THRESHOLDS){
    if(pct===null||!Number.isFinite(pct))return 'unknown';
    if(pct>=thresholds.critical)return 'critical';
    if(pct>=thresholds.danger)return 'danger';
    if(pct>=thresholds.warn)return 'warn';
    return 'ok';
  }
  function metricRisk(metric,thresholds=DEFAULT_THRESHOLDS){
    if(metric?.blocked===true)return 'critical';
    return riskFromPercent(percent(metric?.used,metric?.limit),metric?.thresholds||thresholds);
  }
  const rank={unknown:0,ok:1,warn:2,danger:3,critical:4};
  function providerRisk(provider,thresholds=DEFAULT_THRESHOLDS){
    if(provider?.blocked===true)return 'critical';
    const risks=(provider?.metrics||[]).map(m=>metricRisk(m,thresholds));
    return risks.reduce((a,b)=>rank[b]>rank[a]?b:a,'unknown');
  }
  function parseTime(v){
    if(!v)return null;
    const t=new Date(v).getTime();
    return Number.isFinite(t)?t:null;
  }
  function daysUntil(v,now=Date.now()){
    const t=parseTime(v);if(t===null)return null;
    return Math.ceil((t-now)/DAY);
  }
  function sortedSnapshots(history,providerId,metricId){
    return (history||[])
      .filter(s=>s&&s.providerId===providerId&&s.metrics&&s.metrics[metricId]!==undefined&&parseTime(s.at)!==null)
      .map(s=>({at:parseTime(s.at),value:num(s.metrics[metricId])}))
      .filter(x=>x.value!==null)
      .sort((a,b)=>a.at-b.at);
  }
  function dailyBurn(history,providerId,metricId,windowDays=7){
    const rows=sortedSnapshots(history,providerId,metricId);
    if(rows.length<2)return null;
    const end=rows[rows.length-1],cut=end.at-windowDays*DAY;
    let start=rows.find(x=>x.at>=cut)||rows[0];
    if(start===end&&rows.length>1)start=rows[rows.length-2];
    const days=Math.max((end.at-start.at)/DAY,1/24);
    const delta=end.value-start.value;
    return delta<=0?0:delta/days;
  }
  function forecastMetric(metric,burn,liveDays=10,reservePct=20){
    const used=num(metric?.used),limit=num(metric?.limit);
    if(used===null||limit===null||limit<=0)return {known:false};
    burn=Math.max(0,num(burn,0));
    const dailyReset=metric?.period==='daily';
    const projected=dailyReset?burn:used+burn*liveDays;
    const ceiling=dailyReset?limit:limit*(1-reservePct/100);
    const projectedPct=percent(projected,limit);
    return {
      known:true,
      used,limit,burn,liveDays,reservePct,dailyReset,
      projected,projectedPct,ceiling,
      safe:metric?.blocked!==true&&projected<=ceiling,
      remaining:remaining(used,limit),
      daysToLimit:burn>0&&!dailyReset?Math.max(0,(limit-used)/burn):null
    };
  }
  function liveSafe(provider,history,opts={}){
    const liveDays=num(opts.liveDays,10),defaultReserve=num(opts.reservePct,20);
    if(provider?.blocked===true)return {safe:false,reason:'blocked',metrics:[]};
    const details=(provider?.metrics||[]).filter(m=>num(m.limit)!==null).map(metric=>{
      const burn=dailyBurn(history,provider.id,metric.id,opts.windowDays||7);
      const reserve=metric.liveReservePct===undefined?defaultReserve:num(metric.liveReservePct,defaultReserve);
      return {metric,forecast:forecastMetric(metric,burn,liveDays,reserve)};
    });
    if(!details.length)return {safe:null,reason:'no-data',metrics:[]};
    const known=details.filter(x=>x.forecast.known);
    if(!known.length)return {safe:null,reason:'no-data',metrics:details};
    return {safe:known.every(x=>x.forecast.safe),reason:known.every(x=>x.forecast.safe)?'ok':'forecast-limit',metrics:details};
  }
  function snapshotFromProviders(providers,at=new Date().toISOString(),source='local'){
    const out=[];
    for(const p of providers||[]){
      const metrics={};
      for(const m of p.metrics||[])if(num(m.used)!==null)metrics[m.id]=num(m.used);
      out.push({at,providerId:p.id,metrics,source});
    }
    return out;
  }
  function mergeSnapshot(provider,snapshot){
    if(!provider||!snapshot||provider.id!==snapshot.providerId)return provider;
    const copy=JSON.parse(JSON.stringify(provider));
    for(const m of copy.metrics||[])if(snapshot.metrics&&snapshot.metrics[m.id]!==undefined)m.used=num(snapshot.metrics[m.id],m.used);
    copy.lastUpdate=snapshot.at||copy.lastUpdate;
    copy.lastSource=snapshot.source||copy.lastSource;
    return copy;
  }
  function dueDaily(lastRun,now=Date.now(),hours=24){
    const t=parseTime(lastRun);return t===null||now-t>=hours*3600000;
  }
  function validateProviders(providers){
    const errors=[];
    const ids=new Set();
    for(const p of providers||[]){
      if(!p?.id)errors.push('Provider ohne ID');
      else if(ids.has(p.id))errors.push(`Doppelte Provider-ID: ${p.id}`);
      else ids.add(p.id);
      const mids=new Set();
      for(const m of p?.metrics||[]){
        if(!m?.id)errors.push(`${p.id}: Metrik ohne ID`);
        else if(mids.has(m.id))errors.push(`${p.id}: doppelte Metrik ${m.id}`);
        else mids.add(m.id);
        if(num(m?.limit)!==null&&num(m.limit)<=0)errors.push(`${p.id}/${m.id}: Limit muss > 0 sein`);
        if(num(m?.used)!==null&&num(m.used)<0)errors.push(`${p.id}/${m.id}: Verbrauch darf nicht negativ sein`);
      }
    }
    return errors;
  }
  function compactHistory(history,max=1200){
    return (history||[]).filter(Boolean).sort((a,b)=>(parseTime(b.at)||0)-(parseTime(a.at)||0)).slice(0,max);
  }
  function formatNumber(value,decimals=1){
    const n=num(value);if(n===null)return '–';
    return new Intl.NumberFormat('de-DE',{maximumFractionDigits:decimals}).format(n);
  }
  return {DAY,DEFAULT_THRESHOLDS,num,clamp,percent,remaining,riskFromPercent,metricRisk,providerRisk,daysUntil,sortedSnapshots,dailyBurn,forecastMetric,liveSafe,snapshotFromProviders,mergeSnapshot,dueDaily,validateProviders,compactHistory,formatNumber};
});
