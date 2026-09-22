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
const context = vm.createContext({ window, localStorage, crypto: webcrypto, console });
const source = fs.readFileSync(path.join(__dirname, '..', 'cores/audit-core/audit-core.js'), 'utf8');
vm.runInContext(source, context, { filename: 'audit-core.js' });

const api = window.KCAuditCore;
if (!api) throw new Error('KCAuditCore wurde nicht geladen');

const row = api.append({
  action: 'security-test',
  metadata: {
    password: 'never-log',
    Authorization: 'Bearer never-log',
    apiKey: 'never-log',
    private_key: 'never-log',
    service_role: 'never-log',
    recoveryCode: 'never-log',
    nested: { token: 'never-log', safe: 'ok' },
    safe: 'ok'
  }
});

const encoded = JSON.stringify(row);
for (const secret of ['never-log', 'Bearer never-log']) {
  if (encoded.includes(secret)) throw new Error(`Audit-Redaction fehlgeschlagen: ${secret}`);
}
if (row.metadata.safe !== 'ok' || row.metadata.nested.safe !== 'ok') {
  throw new Error('Unkritische Audit-Metadaten wurden unerwartet entfernt');
}
if (api.VERSION !== '0.2.1') throw new Error(`Unerwartete AuditCore-Version: ${api.VERSION}`);

console.log('PASS AuditCore secret redaction');
