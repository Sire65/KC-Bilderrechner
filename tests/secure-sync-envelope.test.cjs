'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');

(async()=>{
  const window = { crypto: webcrypto };
  const context = vm.createContext({
    window,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    console
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'cores/security-core/crypto-secure-sync.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'crypto-secure-sync.js' });
  const api = window.KCSecureSync;
  if (!api || api.version !== '0.3.1') throw new Error('KCSecureSync V0.3.1 nicht geladen');

  const secret = 'TUV-Testschluessel-2026-123456789';
  const payload = { transactionId: 'TEST-1', total: 12.34 };
  const envelope = await api.encryptEnvelope(payload, { secret, projectId: 'KC_TEST' });
  const restored = await api.decryptEnvelope(envelope, { secret, projectId: 'KC_TEST' });
  if (JSON.stringify(restored) !== JSON.stringify(payload)) throw new Error('Roundtrip fehlgeschlagen');

  for (const iterations of [1, 99999, 1000001, 999999999]) {
    const bad = { ...envelope, iterations };
    let rejected = false;
    try { await api.decryptEnvelope(bad, { secret, projectId: 'KC_TEST' }); } catch (error) {
      rejected = /Iterationszahl/.test(String(error && error.message));
    }
    if (!rejected) throw new Error(`Gefährliche PBKDF2-Iterationszahl nicht abgewiesen: ${iterations}`);
  }

  const badIv = { ...envelope, iv: Buffer.alloc(8).toString('base64') };
  let badIvRejected = false;
  try { await api.decryptEnvelope(badIv, { secret, projectId: 'KC_TEST' }); } catch (error) {
    badIvRejected = /IV-Länge/.test(String(error && error.message));
  }
  if (!badIvRejected) throw new Error('Ungültige AES-GCM-IV-Länge wurde nicht abgewiesen');

  console.log('PASS SecureSync bounded envelope and KDF');
})().catch(error=>{console.error(error);process.exit(1)});
