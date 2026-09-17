const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('v38-acceptance-gate.js','utf8'),context);
const gate=context.window.FLTV38AcceptanceGate;
const pass={pass:true,status:'PASS'};
const good=gate.evaluate({assignment:pass,weightEquipment:pass,documentCompliance:pass,pickupDelivery:pass,autoPopulate:pass,legacyV35:true,legacyV36:true,legacyV37:true});
assert.strictEqual(good.pass,true);
assert.strictEqual(good.status,'PASS');
assert.deepStrictEqual(Array.from(good.failed),[]);
const blocked=gate.evaluate({assignment:pass,weightEquipment:{pass:false,status:'DO NOT DISPATCH'},documentCompliance:pass,pickupDelivery:pass,autoPopulate:pass,legacyV35:true,legacyV36:true,legacyV37:true});
assert.strictEqual(blocked.pass,false);
assert.strictEqual(blocked.status,'BLOCKED');
assert.strictEqual(blocked.failed.includes('weightEquipment'),true);
const regression=gate.evaluate({assignment:pass,weightEquipment:pass,documentCompliance:pass,pickupDelivery:pass,autoPopulate:pass,legacyV35:true,legacyV36:true,legacyV37:false});
assert.strictEqual(regression.pass,false);
assert.strictEqual(regression.failed.includes('legacyV37'),true);

// Fail-closed: an empty evaluation (nothing supplied) must block every milestone.
const empty=gate.evaluate({});
assert.strictEqual(empty.pass,false);
assert.strictEqual(empty.status,'BLOCKED');
assert.deepStrictEqual(Array.from(empty.failed),['assignment','weightEquipment','documentCompliance','pickupDelivery','autoPopulate','legacyV35','legacyV36','legacyV37']);

// Fail-closed: a milestone result that was never evaluated (empty object, no
// pass/status) must not be treated as passing.
const missingAssignment=gate.evaluate({assignment:{},weightEquipment:pass,documentCompliance:pass,pickupDelivery:pass,autoPopulate:pass,legacyV35:true,legacyV36:true,legacyV37:true});
assert.strictEqual(missingAssignment.pass,false);
assert.strictEqual(missingAssignment.status,'BLOCKED');
assert.strictEqual(missingAssignment.failed.includes('assignment'),true);
assert.strictEqual(missingAssignment.checks.assignment,false);

// Fail-closed: an unknown/unrecognized result shape (no pass===true, no
// recognized blocked status string) must not be treated as passing.
const unknownShape=gate.evaluate({assignment:pass,weightEquipment:{note:'not yet run'},documentCompliance:pass,pickupDelivery:pass,autoPopulate:pass,legacyV35:true,legacyV36:true,legacyV37:true});
assert.strictEqual(unknownShape.pass,false);
assert.strictEqual(unknownShape.status,'BLOCKED');
assert.strictEqual(unknownShape.failed.includes('weightEquipment'),true);
assert.strictEqual(unknownShape.checks.weightEquipment,false);

console.log('V3.8 Acceptance Gate milestone, legacy-regression, and fail-closed blocking checks passed.');
