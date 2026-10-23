const assert=require('node:assert');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const financial=fs.readFileSync('v37-financial-close.js','utf8');
assert.match(html,/The V3\.8 operating path, tested end to end\./,'active test-page copy must use V3.8');
assert.doesNotMatch(html,/The V3\.5 operating path, tested end to end\./,'V3.5 must not be described as the active operating path');
assert.match(financial,/Current milestone · V3\.8 acceptance/,'current financial gate milestone must be V3.8');
assert.doesNotMatch(financial,/Current milestone · V3\.7 acceptance/,'V3.7 must not be described as the current milestone');
console.log('V3.8 active-release wording assertions passed.');
