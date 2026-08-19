'use strict';

const assert=require('node:assert/strict');
const api=require('../cores/dom-safety-core/dom-safety-core.js');

assert.equal(api.sanitizeUrl('javascript:alert(1)'),'');
assert.equal(api.sanitizeUrl('JaVaScRiPt:\nalert(1)'),'');
assert.equal(api.sanitizeUrl('data:text/html,<script>alert(1)</script>'),'');
assert.equal(api.sanitizeUrl('data:image/svg+xml;base64,PHN2Zz4='),'');
assert.equal(api.sanitizeUrl('data:image/png;base64,iVBORw0KGgo='),'data:image/png;base64,iVBORw0KGgo=');
assert.equal(api.sanitizeUrl('assets/logo.png'),'assets/logo.png');
assert.equal(api.sanitizeUrl('../assets/logo.png'),'../assets/logo.png');
assert.equal(api.sanitizeUrl('https://example.invalid/a.png'),'https://example.invalid/a.png');
assert.equal(api.sanitizeStyleText('--tile-color:#315d8d'),'--tile-color:#315d8d');
assert.equal(api.sanitizeStyleText('background:#fff;position:fixed;left:0'),'background:#fff');
assert.equal(api.sanitizeStyleText('color:expression(alert(1))'),'');
assert.equal(api.sanitizeStyleText('--group-color:url(javascript:alert(1))'),'');

const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','cores','dom-safety-core','dom-safety-core.js'),'utf8');
assert.match(source,/FORBIDDEN_TAGS/);
assert.match(source,/name\.startsWith\('on'\)/);
assert.match(source,/srcdoc/);
assert.match(source,/javascript:/);
assert.match(source,/data:text\/html/);
assert.match(source,/Object\.defineProperty\(proto,'innerHTML'/);

console.log('PASS DOM Safety Core blocks executable markup, unsafe URL schemes and unsafe inline styles');
