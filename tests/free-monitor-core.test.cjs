'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const corePath=path.join(__dirname,'..','pc-manager','free-monitor-core.js');
const htmlPath=path.join(__dirname,'..','pc-manager','free-monitor.html');
const livePath=path.join(__dirname,'..','pc-manager','free-monitor-live.js');
const monitorPath=path.join(__dirname,'..','pc-manager','failover-monitor.html');
const coreJs=fs.readFileSync(corePath,'utf8');
const html=fs.readFileSync(htmlPath,'utf8');
const liveJs=fs.readFileSync(livePath,'utf8');
const monitorHtml=fs.readFileSync(monitorPath,'utf8');
const C=require(corePath);

// Rechenkern / Grenzwerte.
assert.equal(C.num(null),null,'null darf nicht als 0 interpretiert werden');
assert.equal(C.num(undefined),null,'undefined darf nicht als 0 interpretiert werden');
assert.equal(C.num(''),null,'leerer Wert darf nicht als 0 interpretiert werden');
assert.equal(C.percent(null,100),null,'unbekannter Verbrauch muss unbekannt bleiben');
assert.equal(C.remaining(null,100),null,'Rest darf bei unbekanntem Verbrauch nicht erfunden werden');
assert.equal(C.percent(50,100),50);
assert.equal(C.remaining(25,100),75);
assert.equal(C.riskFromPercent(49),'ok');
assert.equal(C.riskFromPercent(50),'warn');
assert.equal(C.riskFromPercent(76),'danger');
assert.equal(C.riskFromPercent(91),'critical');
assert.equal(C.metricRisk({used:1,limit:100,blocked:true}),'critical');

// LIVE-SAFE Prognose.
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

// Tiefenkonsolidierung: fehlende/stale Quoten dürfen niemals als 0 bzw. grün durchrutschen.
const partialProvider={id:'supabase',metrics:[
 {id:'db',used:42,limit:500,period:'nonreset'},
 {id:'egress',used:null,limit:5,period:'monthly'}
]};
assert.equal(C.providerRisk(partialProvider),'unknown','Teilweise fehlende Pflichtmetrik muss Anbieterstatus offen halten');
assert.equal(C.liveSafe(partialProvider,[],{liveDays:10,reservePct:50}).safe,null,'Fehlende Pflichtmetrik darf keine LIVE-SAFE-Freigabe ergeben');
const staleProvider={id:'cloudflare',stale:true,metrics:[{id:'requests',used:1,limit:100000,period:'daily'}]};
assert.equal(C.providerRisk(staleProvider),'unknown','stale Anbieter muss unbekannt bleiben');
assert.equal(C.liveSafe(staleProvider,[],{liveDays:10,reservePct:50}).safe,null,'stale Anbieter darf nicht LIVE-SAFE werden');
const informationalOnly={id:'github',metrics:[{id:'actions',used:0,limit:2000,informational:true,period:'monthly'}]};
assert.equal(C.providerRisk(informationalOnly),'ok');
assert.equal(C.liveSafe(informationalOnly,[],{liveDays:10,reservePct:50}).safe,true);

const snap=C.snapshotFromProviders([{id:'x',metrics:[{id:'known',used:4},{id:'unknown',used:null}]}],'2026-08-19T00:00:00Z','test')[0];
assert.deepEqual(snap.metrics,{known:4},'Unbekannte Werte dürfen nicht als Nullverbrauch in die Historie geschrieben werden');
assert.equal(C.dueDaily(null,Date.now(),24),true);
assert.equal(C.dueDaily(new Date().toISOString(),Date.now(),24),false);
assert.deepEqual(C.validateProviders([{id:'x',metrics:[{id:'a',used:1,limit:2}]}]),[]);
assert.ok(C.validateProviders([{id:'x',metrics:[{id:'a',used:-1,limit:2}]}]).length>0);
assert.ok(C.validateProviders([{id:'x',stale:'yes',metrics:[]}]).length>0);

// Studio / UI-Vertrag.
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
assert.match(html,/@media\(max-width:720px\)/,'Tablet-/Mobil-Layout fehlt');

const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
assert.ok(inline.length>=1,'Inline-Script fehlt');
for(const code of inline)new vm.Script(code,{filename:'pc-manager/free-monitor.html'});
new vm.Script(coreJs,{filename:'pc-manager/free-monitor-core.js'});
new vm.Script(liveJs,{filename:'pc-manager/free-monitor-live.js'});
const monitorInline=[...monitorHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
assert.equal(monitorInline.length,1,'System- & Testcenter soll genau einen lokalen Scriptblock besitzen');
for(const code of monitorInline)new vm.Script(code,{filename:'pc-manager/failover-monitor.html'});

// Harte Architekturregel: Solange die spätere Automatik nicht bewusst aktiviert wurde,
// bleibt die Manager-Seite lokal-only und lädt den Live-Adapter nicht selbst nach.
assert.doesNotMatch(html,/free-monitor-live\.js/,'Live-Adapter darf vor Aktivierung nicht in HTML geladen werden');
assert.doesNotMatch(coreJs,/createElement\s*\(\s*['"]script['"]|free-monitor-live\.js/,'Core darf den Live-Adapter nicht heimlich aktivieren');

// Harte 0-Credit-Regel: Der aktive Free-Monitor startet keine Provider-Laufzeit oder kostenrelevante Cloud-Aktion.
assert.doesNotMatch(html,/\bfetch\s*\(/,'HTML darf selbst keinen fetch ausführen');
assert.doesNotMatch(html,/XMLHttpRequest|WebSocket|EventSource/,'HTML darf keine Hintergrund-Netzschnittstelle öffnen');
assert.doesNotMatch(html,/\.netlify\/functions|workers\.dev|api\.supabase\.com|console\.neon\.tech\/api|api\.cloudflare\.com/i,'HTML darf keinen metered Provider-Pfad fest verdrahten');
assert.doesNotMatch(html,/\beval\s*\(|new\s+Function\s*\(/,'Free-Monitor darf keine dynamische Codeausführung verwenden');

// Der vorbereitete, derzeit dormante Live-Adapter darf exakt einen read-only GitHub-Raw-Snapshot lesen.
assert.match(liveJs,/https:\/\/raw\.githubusercontent\.com\/Sire65\/KC-Bilderrechner\/monitor-free-usage-data\/pc-manager\/free-monitor-live\.json/,'GitHub-Raw-Snapshot fehlt');
const fetchCalls=[...liveJs.matchAll(/\bfetch\s*\(/g)].length;
assert.equal(fetchCalls,1,'Live-Adapter darf genau einen Fetch-Pfad besitzen');
assert.doesNotMatch(liveJs,/XMLHttpRequest|WebSocket|EventSource|\.netlify\/functions|workers\.dev|api\.supabase\.com|console\.neon\.tech\/api|api\.cloudflare\.com/i,'Live-Adapter darf keinen Provider-Runtime-/Management-Endpunkt direkt aufrufen');
assert.doesNotMatch(liveJs,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,'Live-Adapter darf keine schreibende HTTP-Methode verwenden');
assert.doesNotMatch(liveJs,/credentials\s*:\s*['"]include['"]/i,'Live-Adapter darf keine Browser-Credentials mitsenden');
assert.match(liveJs,/hostname!==['"]raw\.githubusercontent\.com['"]/,'Live-Adapter braucht eine feste Host-Allowlist');
assert.match(liveJs,/snap\.stale!==undefined/,'stale-Status muss aus dem Snapshot übernommen werden');
assert.match(liveJs,/isDuplicate\(/,'Snapshot-Historie braucht Dublettenschutz');
assert.match(liveJs,/MAX_SNAPSHOT_BYTES=262144/,'Live-Snapshot braucht eine harte Größenobergrenze');
assert.match(liveJs,/content-length/,'Content-Length muss vor dem Parsen geprüft werden');
assert.match(liveJs,/if\(text\.length>MAX_SNAPSHOT_BYTES\)/,'Tatsächliche Snapshot-Größe muss ebenfalls geprüft werden');
assert.doesNotMatch(liveJs,/await\s+r\.json\s*\(/,'Snapshot darf nicht ungeprüft direkt als JSON geparst werden');
assert.match(liveJs,/if\(v===null\|\|v===undefined\|\|v===''\)return null/,'Live-Adapter darf null nicht als 0 übernehmen');
assert.match(liveJs,/n>=0\?n:null/,'Live-Adapter darf keine negativen Verbrauchswerte übernehmen');

// System- & Testcenter: keine versteckte Dauerlast, Cloudflare zuerst, Netlify nur Fallback/Extra-Prüfung.
assert.match(monitorHtml,/FREE-SAFE:/,'Free-Safe-Hinweis im Testcenter fehlt');
assert.doesNotMatch(monitorHtml,/setInterval\s*\(/,'Testcenter darf keine periodische Hintergrundabfrage starten');
assert.match(monitorHtml,/makeTests\(\);renderHistory\(\);standbyB\(\);/,'Testcenter darf beim Öffnen keinen automatischen Gateway-Request auslösen');
assert.match(monitorHtml,/if\(a\.ok\)\{standbyB\(\)\}else\{const b=await getJSON\(B\+'\/'/,'Netlify darf beim Systemcheck nur als Fallback nach Cloudflare-Ausfall laufen');
const oneA=monitorHtml.indexOf("getJSON(`${A}/scenario/${id}`");
const oneB=monitorHtml.indexOf("getJSON(`${B}/scenario/${id}`");
assert.ok(oneA>=0&&oneB>oneA,'Einzeltests müssen Cloudflare vor Netlify verwenden');
const matrixA=monitorHtml.indexOf("getJSON(A+'/supergau/server-matrix'");
const matrixB=monitorHtml.indexOf("getJSON(B+'/supergau/server-matrix'");
assert.ok(matrixA>=0&&matrixB>matrixA,'Gesamttests müssen Cloudflare vor Netlify verwenden');
assert.match(monitorHtml,/credentials:'omit'/,'Gateway-Prüfungen dürfen keine Browser-Credentials mitsenden');
assert.match(monitorHtml,/esc\(r\.body\?\.activeBackend/,'Remote Backendwerte müssen escaped werden');
assert.match(monitorHtml,/esc\(r\.error\|\|r\.status/,'Remote Fehlermeldungen müssen escaped werden');

console.log('PASS KC Manager deep regression: Free-Monitor core, unknown/stale fail-closed, LIVE-SAFE, bounded dormant sync, Studio UI, zero-credit architecture and Free-Safe testcenter');
