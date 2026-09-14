const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const sandbox={
  window:{},
  document:{getElementById(){return null;}},
  localStorage:{getItem(){return null;}},
  console
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('v36-actual-trip.js','utf8'),sandbox);

const api=sandbox.window.FLTActualTrip;
assert.ok(api);

const duplicateBase={snapshotId:'ACT-BASE',createdAt:'2026-09-10T08:00:00Z',actualMiles:500,actualGallons:100,averageFuelPrice:3.5,fuelCost:350,actualMpg:5,truckId:'TRUCK-1',truckUnit:'Unit 1',noTollsIncurred:true,note:'Same trip'};
const duplicateLater={...duplicateBase,snapshotId:'ACT-DUPE',createdAt:'2026-09-10T09:00:00Z'};
const distinctTrip={...duplicateBase,snapshotId:'ACT-DISTINCT',createdAt:'2026-09-11T09:00:00Z',actualMiles:540,fuelCost:378,actualMpg:5.4,note:'Different trip'};
const otherLoadTrip={...duplicateBase,snapshotId:'ACT-OTHER',createdAt:'2026-09-12T09:00:00Z',note:'Other load trip'};

const load={id:'FLT-000001',actualTripRecords:[duplicateBase,duplicateLater]};
const normalized=api.normalizeTripRecords(load);
assert.equal(normalized.length,1);
assert.equal(normalized[0].snapshotId,'ACT-DUPE');

const duplicateSave=api.saveTripRecord(load,{...duplicateBase,snapshotId:'ACT-NEW',createdAt:'2026-09-10T10:00:00Z'});
assert.equal(duplicateSave.duplicate,true);
assert.equal(duplicateSave.records.length,1);
assert.equal(duplicateSave.record.snapshotId,'ACT-DUPE');

const distinctSave=api.saveTripRecord({id:'FLT-000001',actualTripRecords:duplicateSave.records},distinctTrip);
assert.equal(distinctSave.duplicate,false);
assert.equal(distinctSave.records.length,2);

const history=api.allVehicleRecordsForLoads([
  {id:'FLT-000001',actualTripRecords:[duplicateBase,duplicateLater]},
  {id:'FLT-000002',actualTripRecords:[otherLoadTrip]}
],'TRUCK-1');
assert.equal(history.length,2);
assert.deepEqual(history.map(item=>item.loadId),['FLT-000002','FLT-000001']);

const indexHtml=fs.readFileSync('index.html','utf8');
assert.match(indexHtml,/Family Legacy Commercial Command™ V3\.8/);
assert.match(indexHtml,/Family Legacy Commercial Command™ \/ V3\.8/);
assert.match(indexHtml,/The V3\.8 operating path, tested end to end\./);
assert.match(indexHtml,/V3\.8 health/);
assert.doesNotMatch(indexHtml,/The V3\.5 operating path, tested end to end\./);
assert.doesNotMatch(indexHtml,/V3\.5 health/);

const financialCloseSource=fs.readFileSync('v37-financial-close.js','utf8');
assert.match(financialCloseSource,/Current milestone · V3\.8 acceptance/);
assert.doesNotMatch(financialCloseSource,/Current milestone · V3\.7 acceptance/);

console.log('V3.8 actual trip deduplication and current-release wording checks passed.');
