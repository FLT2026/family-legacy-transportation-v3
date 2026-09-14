const assert=require('node:assert');
const fs=require('node:fs');

const indexHtml=fs.readFileSync('index.html','utf8');
assert.match(indexHtml,/Family Legacy Commercial Command™ V3\.8/);
assert.match(indexHtml,/Family Legacy Commercial Command™ \/ V3\.8/);
assert.match(indexHtml,/V3\.8 COMMERCIAL COMMAND/);
assert.match(indexHtml,/V3\.8 Test Gate/);
assert.match(indexHtml,/The V3\.8 operating path, tested end to end\./);
assert.match(indexHtml,/V3\.8 health/);
assert.doesNotMatch(indexHtml,/The V3\.5 operating path, tested end to end\./);
assert.doesNotMatch(indexHtml,/V3\.5 health/);

const financialCloseSource=fs.readFileSync('v37-financial-close.js','utf8');
assert.match(financialCloseSource,/Current milestone · V3\.8 acceptance/);
assert.doesNotMatch(financialCloseSource,/Current milestone · V3\.7 acceptance/);

console.log('V3.8 current-release wording checks passed.');
