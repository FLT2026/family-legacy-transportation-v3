const assert=require('assert');
const fs=require('fs');
const vm=require('node:vm');

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

{
  const test={classList:{contains:()=>false},querySelector:()=>null,querySelectorAll:()=>[]};
  let load,persisted=0;
  const sandbox={
    window:{addEventListener(){},FLTUpdateOverallGate(){}},
    document:{readyState:'complete',getElementById:id=>id==='test'?test:null,addEventListener(){}},
    localStorage:{getItem:()=>null,setItem(){throw new Error('Rendering must not write storage')}},
    current:()=>load,persist(){persisted++},setTimeout(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  for(const status of ['Open','Closed','Correction Open']){
    for(const receipt of [undefined,{filename:'fuel.pdf'},{documentId:'BOL-1',source:'v38-load-document'}]){
      load={
        id:'RECEIPT-TEST',
        expenses:[{id:'EXP-1',category:'Fuel',amount:100,...(receipt?{receipt}:{})}],
        documents:['Bill of Lading / Shipping Document','Pickup Receipt','Delivery Receipt'].map((type,index)=>({
          id:'DOC-'+index,loadId:'RECEIPT-TEST',type,stage:index===2?'delivery':'pickup',status:'Active'
        })),
        actualTripRecords:[{snapshotId:'ACT-1',truckId:null}],
        journalEntries:[{id:'JRN-1',sourceId:'EXP-1'}],
        financialClose:{status,snapshot:{expenses:[{id:'EXP-1',category:'Fuel',amount:100}]}},
        financialCloseHistory:[{type:'Correction Opened',reason:'Original history'}]
      };
      const before=JSON.stringify(load);
      sandbox.window.FLTV38TestGateIntegrity.repairVisibleGate();
      sandbox.window.FLTV38TestGateIntegrity.repairVisibleGate();
      assert.equal(JSON.stringify(load),before,'Test Gate must not promote shipping evidence or rewrite '+status+' financial history');
    }
  }
  assert.equal(persisted,0,'Test Gate evidence checks must remain read-only');
}

console.log('V3.8 Test Gate guidance and read-only receipt/snapshot/history preservation checks passed.');
