'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../pc-manager/free-monitor-core.js');

assert.equal(C.percent(50,100),50);
assert.equal(C.remaining(25,100),75);
assert.equal(C.riskFromPercent(49),'ok');
assert.equal(C.riskFromPercent(50),'warn');
assert.equal(C.riskFromPercent(76),'danger');
assert.equal(C.riskFromPercent(91),'critical');
assert.equal(C.metricRisk({used:1,limit:100,blocked:true}),'critical');

const provider={id:'netlify',blocked:false,metrics:[{id:'credits',used:30,limit:300,liveReservePct:80,period:'monthly'}]};
const history=[
 {at:'2026-08-17T00:00:00Z',providerId:'netlify',metrics:{credits:15}},
 {at:'2026-08-18T00:00:00Z',providerId:'netlify',metrics:{credits:30}}
];
assert.equal(C.dailyBurn(history,'netlify','credits',7),15);
const live=C.liveSafe(provider,history,{liveDays:10,reservePct:50});
assert.equal(live.safe,false,'Netlify mit 15 Credits/Tag Burnrate und 80 % Reserve muss nicht LIVE-SAFE sein');

const safeProvider={id:'safe',metrics:[{id:'x',used:10,limit:100,period:'monthly',liveReservePct:20}]};
const safeHistory=[
 {at:'2026-08-17T00:00:00Z',providerId:'safe',metrics:{x:9}},
 {at:'2026-08-18T00:00:00Z',providerId:'safe',metrics:{x:10}}
];
assert.equal(C.liveSafe(safeProvider,safeHistory,{liveDays:10,reservePct:20}).safe,true);
assert.equal(C.dueDaily(null,Date.now(),24),true);
assert.equal(C.dueDaily(new Date().toISOString(),Date.now(),24),false);
assert.deepEqual(C.validateProviders([{id:'x',metrics:[{id:'a',used:1,limit:2}]}]),[]);
assert.ok(C.validateProviders([{id:'x',metrics:[{id:'a',used:-1,limit:2}]}]).length>0);

const html=fs.readFileSync(path.join(__dirname,'..','pc-manager','free-monitor.html'),'utf8');
assert.match(html,/Strikter 0-Credit-Modus/);
assert.match(html,/Tägliche lokale Auto-Prüfung/);
assert.match(html,/Netlify/);
assert.match(html,/Supabase/);
assert.match(html,/Neon/);
assert.match(html,/GitHub/);
assert.match(html,/Cloudflare/);
assert.match(html,/10-Tage Weihnachtsmarkt/);
assert.match(html,/canvas id="pie"/);
assert.match(html,/canvas id="bars"/);
assert.match(html,/canvas id="line"/);
assert.match(html,/canvas id="columns"/);

const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
assert.ok(inline.length>=1,'Inline-Script fehlt');
for(const code of inline)new vm.Script(code,{filename:'pc-manager/free-monitor.html'});

// Harte Schutzregel: Dieses Modul selbst darf keine externen Requests auslösen.
// So können tägliche und manuelle Prüfungen keine Netlify/Cloudflare/Supabase/Neon-Credits verbrauchen.
assert.doesNotMatch(html,/\bfetch\s*\(/,'Free-Monitor darf im 0-Credit-Modus keinen fetch ausführen');
assert.doesNotMatch(html,/XMLHttpRequest/,'Free-Monitor darf keine XHR-Netzabfrage ausführen');
assert.doesNotMatch(html,/\.netlify\/functions|workers\.dev|api\.supabase\.com|console\.neon\.tech\/api/i,'Free-Monitor darf keinen metered Provider-Pfad fest verdrahten');

console.log('PASS KC Free-Monitor logic, browser syntax, LIVE-SAFE forecast, charts and strict zero-credit network contract');
