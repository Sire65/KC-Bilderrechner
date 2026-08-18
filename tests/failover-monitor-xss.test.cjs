'use strict';

const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'pc-manager/failover-monitor.html'), 'utf8');
const script = (html.match(/<script>([\s\S]*?)<\/script>/i) || [,''])[1];
if (!script) throw new Error('Failover-Monitor-Script nicht gefunden');
if (/\.innerHTML\s*=/.test(script)) throw new Error('Failover-Monitor verwendet innerHTML im Status-Rendering');
if (!/textContent/.test(script) || !/replaceChildren/.test(script)) throw new Error('Sicheres DOM-Rendering nicht eindeutig nachweisbar');
if (!/String\(r\.error/.test(script)) throw new Error('Externe Fehlertexte werden nicht explizit als Text behandelt');
console.log('PASS Failover monitor external-status XSS hardening');
