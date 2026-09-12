const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const code=fs.readFileSync('v38-fast-load-workflow.js','utf8');
const sandbox={window:{},localStorage:{data:{},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)}},console};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.FLTFastLoadWorkflow;
assert.ok(api,'fast load workflow API should load without a DOM');
assert.equal(api.fiveZip('27601'),'27601');
assert.equal(api.fiveZip('2'),'');
assert.equal(api.decisionAccepted({decision:'ACCEPT LOAD'}),true);
assert.equal(api.decisionAccepted({decision:'NEGOTIATE RATE'}),false);
assert.equal(api.decisionAccepted({decision:'PASS ON LOAD'}),false);
assert.equal(api.proposalReady({pickupZip:'27601',deliveryZip:'28301',offer:1240,cargoWeight:5000,loadedMiles:245,deadheadMiles:35}),true);
assert.equal(api.proposalReady({pickupZip:'27601',deliveryZip:'2',offer:1240,cargoWeight:5000,loadedMiles:245,deadheadMiles:35}),false);
sandbox.localStorage.setItem('flt-v38-accepted-proposal',JSON.stringify({pickupZip:'27601',deliveryZip:'28301',offer:1240,cargoWeight:5000,loadedMiles:245,deadheadMiles:35}));
assert.equal(api.canCompleteLoad(),true,'accepted proposal should unlock detailed load setup');
console.log('V3.8 profitability-first quick decision and accepted-load gate checks passed.');
