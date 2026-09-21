const assert=require('assert');
const fs=require('fs');

const source=fs.readFileSync('v38-test-gate-integrity-hardfix.js','utf8');

assert.ok(
  source.includes('complete the operator workflow here before V3.8 is signed off'),
  'The live Test Gate must explain the current V3.8 acceptance step.'
);
assert.ok(
  source.includes('full V3.7 + V3.8 regression suite'),
  'The live Test Gate must distinguish automated regression coverage from operator acceptance.'
);
assert.equal(
  /before PR #\d+ is merged/i.test(source),
  false,
  'Merged pull-request instructions must not remain in the live Test Gate.'
);

console.log('V3.8 Test Gate current-release guidance regression checks passed.');
