'use strict';

const assert = require('node:assert/strict');
const ProductInfoCore = require('../cores/product-info-core/product-info-core.js');

function completeAllergens(value = 'not-contained') {
  return Object.fromEntries(ProductInfoCore.BIG14.map(id => [id, value]));
}

const approved = {
  productId: 'ART-TEST-1',
  status: 'approved',
  source: 'Herstellerdatenblatt 2026-08-18',
  approvedBy: 'QS Test',
  approvedAt: '2026-08-18T18:00:00.000Z',
  allergens: completeAllergens()
};

let result = ProductInfoCore.validate(approved);
assert.equal(result.ok, true, result.errors.join('; '));
assert.equal(ProductInfoCore.canPublish(approved), true);
assert.deepEqual(ProductInfoCore.unknownAllergens(approved), []);

const missingOne = structuredClone(approved);
delete missingOne.allergens.mustard;
result = ProductInfoCore.validate(missingOne);
assert.equal(result.ok, false);
assert.equal(ProductInfoCore.canPublish(missingOne), false);
assert.ok(result.errors.some(x => x.includes('mustard')), result.errors.join('; '));

const explicitUnchecked = structuredClone(approved);
explicitUnchecked.allergens.milk = 'not-checked';
result = ProductInfoCore.validate(explicitUnchecked);
assert.equal(result.ok, false);
assert.ok(result.errors.some(x => x.includes('milk')), result.errors.join('; '));

const noApprover = structuredClone(approved);
noApprover.approvedBy = '';
result = ProductInfoCore.validate(noApprover);
assert.equal(result.ok, false);
assert.ok(result.errors.includes('Freigebende Person fehlt'));

const draft = {
  productId: 'ART-DRAFT-1',
  status: 'draft',
  allergens: {}
};
result = ProductInfoCore.validate(draft);
assert.equal(result.ok, true, 'Entwürfe dürfen noch unvollständige Allergenangaben enthalten.');
assert.equal(ProductInfoCore.canPublish(draft), false);
assert.equal(ProductInfoCore.unknownAllergens(draft).length, ProductInfoCore.BIG14.length);

console.log('PASS ProductInfo approved records require complete Big-14 review and approver');
