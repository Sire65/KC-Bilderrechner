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
const liveJs=fs.readFileSync(path.join(__dirname,'..','pc-manager','free-monitor-live.js'),'utf8');
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
new vm.Script(liveJs,{filename:'pc-manager/free-monitor-live.js'});

// Harte Schutzregel: Der Manager selbst startet keine Provider-Laufzeit oder kostenrelevante Cloud-Aktion.
assert.doesNotMatch(html,/\bfetch\s*\(/,'HTML darf selbst keinen fetch ausführen');
assert.doesNotMatch(html,/XMLHttpRequest/,'HTML darf keine XHR-Netzabfrage ausführen');
assert.doesNotMatch(html,/\.netlify\/functions|workers\.dev|api\.supabase\.com|console\.neon\.tech\/api|api\.cloudflare\.com/i,'HTML darf keinen metered Provider-Pfad fest verdrahten');

// Der Live-Adapter darf genau einen read-only GitHub-Raw-Snapshot lesen und sonst keinen Provider direkt aufrufen.
assert.match(liveJs,/https:\/\/raw\.githubusercontent\.com\/Sire65\/KC-Bilderrechner\/monitor-free-usage-data\/pc-manager\/free-monitor-live\.json/,'GitHub-Raw-Snapshot fehlt');
const fetchCalls=[...liveJs.matchAll(/\bfetch\s*\(/g)].length;
assert.equal(fetchCalls,1,'Live-Adapter darf genau einen Fetch-Pfad besitzen');
assert.doesNotMatch(liveJs,/XMLHttpRequest|\.netlify\/functions|workers\.dev|api\.supabase\.com|console\.neon\.tech\/api|api\.cloudflare\.com/i,'Live-Adapter darf keinen Provider-Runtime-/Management-Endpunkt direkt aufrufen');
assert.doesNotMatch(liveJs,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,'Live-Adapter darf keine schreibende HTTP-Methode verwenden');
assert.doesNotMatch(liveJs,/credentials\s*:\s*['"]include['"]/i,'Live-Adapter darf keine Browser-Credentials mitsenden');

console.log('PASS KC Free-Monitor logic, browser syntax, LIVE-SAFE forecast, charts and zero-credit GitHub snapshot contract');
