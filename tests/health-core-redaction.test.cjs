'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const store = new Map();
const localStorage = {
  getItem: key => store.has(String(key)) ? store.get(String(key)) : null,
  setItem: (key, value) => store.set(String(key), String(value)),
  removeItem: key => store.delete(String(key))
};
const window = {};
const context = vm.createContext({
  window, localStorage, crypto: webcrypto, console,
  TextEncoder, TextDecoder,
  setTimeout, clearTimeout,
  performance: { now: () => 0 },
  navigator: { onLine: true },
  document: { addEventListener() {}, visibilityState: 'visible' },
  addEventListener() {},
  requestIdleCallback: undefined,
  PerformanceObserver: undefined,
  btoa: value => Buffer.from(value, 'binary').toString('base64')
});
const source = fs.readFileSync(path.join(__dirname, '..', 'cores/health-core/health-core.js'), 'utf8');
vm.runInContext(source, context, { filename: 'health-core.js' });
const api = window.KCHealthCore;
if (!api || api.VERSION !== '1.0.1') throw new Error('KCHealthCore V1.0.1 nicht geladen');

const sanitized = api.sanitize({
  Authorization: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ.1234567890',
  apiKey: 'never-log',
  message: 'Request failed Authorization: Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ.1234567890 token=never-log',
  safe: 'sichtbar'
});
const encoded = JSON.stringify(sanitized);
if (/never-log|ABCDEFGHIJKLMNOPQRSTUVWXYZ/.test(encoded)) throw new Error('HealthCore Secret-Redaction fehlgeschlagen');
if (sanitized.safe !== 'sichtbar') throw new Error('Unkritische Health-Daten wurden entfernt');
if (!/REDACTED/.test(sanitized.message)) throw new Error('Secret im Fehlertext wurde nicht redigiert');

console.log('PASS HealthCore diagnostic secret redaction');
