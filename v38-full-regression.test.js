const {spawnSync}=require('child_process');
const tests=[
  'v37-itemized-invoice.test.js',
  'v37-payments-receivables.test.js',
  'v37-double-entry-ledger.test.js',
  'v37-financial-close.test.js',
  'v38-assignment-integrity.test.js',
  'v38-assignment-ui.test.js',
  'v38-weight-equipment-fit.test.js',
  'v38-weight-equipment-ui.test.js',
  'v38-document-compliance.test.js',
  'v38-document-compliance-ui.test.js',
  'v38-pickup-delivery-integrity.test.js',
  'v38-pickup-delivery-ui.test.js',
  'v38-autopopulate-audit.test.js',
  'v38-acceptance-gate.test.js'
];
let failed=[];
for(const test of tests){
  console.log('\n=== '+test+' ===');
  const result=spawnSync(process.execPath,[test],{stdio:'inherit'});
  if(result.status!==0) failed.push(test);
}
console.log('\n=== V3.8 FULL REGRESSION SUMMARY ===');
console.log('Passed: '+(tests.length-failed.length)+' / '+tests.length);
if(failed.length){
  console.error('FAILED: '+failed.join(', '));
  process.exit(1);
}
console.log('ALL AUTOMATED V3.7 + V3.8 REGRESSION TESTS PASSED.');
console.log('V3.8 is eligible for final acceptance review; merge remains blocked until the required live/manual acceptance checks are confirmed.');
