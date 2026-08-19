'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','shared','runtime-flags.js'),'utf8');

assert.match(source,/\(\^\|\\\/\)pos\(\\\/\|\$\)/i,'Bootstrap muss auf POS-Pfad begrenzt sein.');
assert.match(source,/dual-gateway-bootstrap\.js/,'Dual-Gateway-Bootstrap fehlt.');
assert.match(source,/local-vault-bootstrap\.js/,'Local-Vault-Bootstrap fehlt.');
assert.match(source,/DOMContentLoaded/,'Local Vault soll erst nach initialer POS-Hydrierung starten.');
assert.doesNotMatch(source,/https?:\/\//i,'Bootstrap darf keine externen Scriptquellen laden.');
assert.doesNotMatch(source,/\beval\s*\(|new\s+Function\s*\(/,'Bootstrap darf keinen dynamischen Code ausführen.');

console.log('PASS POS runtime bootstrap wires dual gateway and encrypted local vault from self origin');
