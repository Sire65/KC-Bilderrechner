'use strict';

const assert = require('node:assert/strict');
global.window = {};
require('../cores/security-core/security-core.js');
const core = global.window.KCSecurityCore;

const now = Date.now();
const recentPin = {valid:true, loginMethod:'pin', startedAt:new Date(now-60_000).toISOString()};
let d = core.decision('cash.withdraw',{role:'manager',session:recentPin});
assert.equal(d.allowed,true);
assert.equal(d.stepUpSatisfied,true);

d = core.decision('cash.withdraw',{role:'cashier',session:recentPin});
assert.equal(d.allowed,false);
assert.equal(d.code,'DENY_PERMISSION');

const stalePin = {valid:true, loginMethod:'pin', startedAt:new Date(now-10*60_000).toISOString()};
d = core.decision('cash.withdraw',{role:'manager',session:stalePin});
assert.equal(d.allowed,false);
assert.equal(d.code,'STEP_UP_REQUIRED');
assert.equal(d.requiresStepUp,true);

d = core.decision('reports.read',{role:'manager',session:stalePin});
assert.equal(d.allowed,true,'Nicht-Step-Up-Recht bleibt innerhalb der Session gültig.');

const developer = {valid:true, loginMethod:'developer', startedAt:new Date(now-30_000).toISOString()};
d = core.decision('cash.withdraw',{role:'superadmin',session:developer});
assert.equal(d.allowed,false,'Entwicklerzugang darf Step-Up nicht erfüllen.');
assert.equal(d.code,'STEP_UP_REQUIRED');

const expired = {valid:true, loginMethod:'pin', startedAt:new Date(now-31*60_000).toISOString()};
d = core.decision('reports.read',{role:'manager',session:expired});
assert.equal(d.allowed,false);
assert.equal(d.code,'SESSION_EXPIRED');

const noTimestamp = {valid:true, loginMethod:'pin'};
d = core.decision('reports.read',{role:'manager',session:noTimestamp});
assert.equal(d.allowed,false);
assert.equal(d.code,'SESSION_TIMESTAMP_REQUIRED');

console.log('PASS SecurityCore enforces permission, step-up freshness and session expiry');
