const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('v36-actual-trip.js','utf8');
const expenseSource=fs.readFileSync('index.html','utf8');
const hardfixSource=fs.readFileSync('v38-v36-autopopulate-hardfix.js','utf8');

function createHarness(load){
  const elements=new Map();
  let sandbox;
  const makeElement=id=>({
    id,value:'',checked:false,hidden:false,innerHTML:'',textContent:'',className:'',style:{},listeners:{},
    addEventListener(type,listener){(this.listeners[type]??=[]).push(listener)},
    appendChild(child){child.parentNode=this;return child},
    insertBefore(child){child.parentNode=this;return child},
    querySelector(){return null}
  });
  const addElement=id=>{const element=makeElement(id);elements.set(id,element);return element};
  const form=addElement('v36-actual-form');
  form.elements={};
  ['odometerStart','odometerEnd','actualMiles','actualGallons','averageFuelPrice','fuelCost','note'].forEach(name=>form.elements[name]={value:'',name});
  form.elements.noTollsIncurred={checked:false,name:'noTollsIncurred'};
  form.reset=()=>Object.values(form.elements).forEach(field=>{if('checked'in field)field.checked=false;else field.value=''});
  const finance=addElement('finance'),anchor=makeElement('finance-anchor');
  anchor.parentNode={insertBefore(){}};
  finance.querySelector=()=>anchor;
  const test=addElement('test');
  const ids=['v36-record-status','v36-actual-mpg','v36-truck-label','v36-cost-variance','v36-cost-detail','v36-mile-variance','v36-mile-detail','v36-post-fuel','v36-evidence','v36-evidence-status','v36-history-count','v36-mpg-history','v36-reconciliation','v36-reconciliation-status','v36-gate-checks','v36-gate-status','v36-use-estimate','clock'];
  ids.forEach(id=>{if(!elements.has(id))addElement(id)});
  const document={
    title:'',
    createElement:()=>makeElement(''),
    getElementById:id=>elements.get(id)||null,
    querySelector:()=>null,
    querySelectorAll:()=>[],
    addEventListener(){}
  };
  const formData=class{
    constructor(target){this.target=target}
    get(name){const field=this.target.elements[name];if(name==='noTollsIncurred')return field.checked?'on':null;return field?.value??null}
  };
  let expenseSequence=0;
  const window={
    FLTExpense:{
      open(defaults,metadata){
        const entry={category:defaults.category,amount:Number(defaults.amount),date:defaults.date,...metadata.record};
        const index=load.expenses.findIndex(item=>item.source===entry.source||(entry.linkedSnapshotId&&item.linkedSnapshotId===entry.linkedSnapshotId));
        if(index>=0)load.expenses[index]={...load.expenses[index],...entry};
        else load.expenses.push({...entry,id:'EXP-TEST-'+(++expenseSequence)});
        const posted=new Set(load.journalEntries.map(item=>item.sourceId));
        if(!posted.has(load.expenses.at(-1).id))load.journalEntries.push({sourceId:load.expenses.at(-1).id});
        sandbox.renderFinance();
      }
    },
    addEventListener(){},
    FLTUpdateOverallGate(){}
  };
  const localStorage={
    getItem(key){
      if(key==='flt-v35-estimate-snapshots')return '[]';
      if(key==='flt-v35-fleet')return JSON.stringify({locks:[]});
      return null;
    }
  };
  sandbox={
    document,window,localStorage,FormData:formData,
    store:{loads:[load]},
    current:()=>load,
    persist(){},
    toast(){},
    renderFinance(){},
    setTimeout(callback){callback()},
    Date
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return{sandbox,elements,form,load};
}

function submitTrip(harness,{noTolls=true}={}){
  const {form}=harness;
  Object.assign(form.elements.odometerStart,{value:'1000'});
  Object.assign(form.elements.odometerEnd,{value:'1120'});
  Object.assign(form.elements.actualMiles,{value:'120'});
  Object.assign(form.elements.actualGallons,{value:'20'});
  Object.assign(form.elements.averageFuelPrice,{value:'4'});
  Object.assign(form.elements.fuelCost,{value:'80'});
  Object.assign(form.elements.note,{value:'Trip complete'});
  form.elements.noTollsIncurred.checked=noTolls;
  form.listeners.submit[0]({preventDefault(){},currentTarget:form});
}

function makeLoad(records=[]){
  return{id:'FLT-TRIP-1',deliveryDate:'2026-10-16',expenses:[],journalEntries:[],actualTripRecords:records};
}

{
  const load=makeLoad(),harness=createHarness(load);
  submitTrip(harness);
  const firstSnapshot=load.actualTripRecords[0],firstSnapshotId=firstSnapshot.snapshotId;
  const firstSnapshotJson=JSON.stringify(firstSnapshot);
  assert.equal(firstSnapshot.noTollsIncurred,true,'the selected no-tolls status is saved');
  assert.equal(harness.form.elements.noTollsIncurred.checked,true,'saving and confirming fuel does not clear the checkbox');
  assert.equal(load.expenses.length,1,'the confirmed fuel expense is posted once');
  assert.equal(load.journalEntries.length,1,'the fuel ledger posting is created once');

  load.expenses[0].receipt={filename:'fuel-receipt.pdf',mimeType:'application/pdf'};
  harness.elements.get('v36-post-fuel').listeners.click[0]();
  assert.equal(load.expenses.length,1,'reopening fuel confirmation updates the existing expense');
  assert.equal(load.journalEntries.length,1,'reopening fuel confirmation does not duplicate the ledger posting');
  assert.deepEqual(load.expenses[0].receipt,{filename:'fuel-receipt.pdf',mimeType:'application/pdf'},'reopening fuel confirmation preserves its receipt');

  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,1,'saving unchanged facts again reuses the existing snapshot');
  assert.equal(load.actualTripRecords[0].snapshotId,firstSnapshotId,'repeat save preserves the snapshot identity');
  assert.equal(JSON.stringify(load.actualTripRecords[0]),firstSnapshotJson,'repeat save does not rewrite the existing immutable snapshot');
  assert.equal(load.actualTripRecords[0].noTollsIncurred,true,'repeat save preserves toll status');
  assert.equal(load.expenses.length,1,'repeat save does not add a second fuel expense');
  assert.equal(load.journalEntries.length,1,'repeat save does not add a second fuel ledger posting');
  assert.equal(harness.elements.get('v36-history-count').textContent,'1 trip','repeat save creates only one MPG-history entry');
}

{
  const first={snapshotId:'ACT-OLD',loadId:'FLT-TRIP-1',createdAt:'2026-10-15T10:00:00.000Z',truckId:'TRUCK-1',truckUnit:'Truck 1',actualMiles:100,actualGallons:20,actualMpg:5};
  const latest={...first,snapshotId:'ACT-LATEST',createdAt:'2026-10-16T10:00:00.000Z',actualMiles:120,actualMpg:6};
  const load=makeLoad([first,latest]),harness=createHarness(load);
  assert.equal(harness.elements.get('v36-history-count').textContent,'1 trip','legacy duplicate snapshots for one load render as one history trip');
  assert.equal(load.actualTripRecords.length,2,'valid historical snapshots remain stored');
  assert.ok(harness.elements.get('v36-mpg-history').innerHTML.includes('6.00 MPG'),'history uses the latest snapshot for the load');
}

{
  const existing={snapshotId:'ACT-LEGACY',loadId:'FLT-TRIP-1',createdAt:'2026-10-16T10:00:00.000Z',odometerStart:1000,odometerEnd:1120,actualMiles:120,actualGallons:20,averageFuelPrice:4,fuelCost:80,truckId:null,truckUnit:null,actualMpg:6};
  const load=makeLoad([existing]),harness=createHarness(load);
  load.expenses.push({id:'EXP-LEGACY',category:'Fuel',amount:80,date:'2026-10-16',linkedSnapshotId:existing.snapshotId,receipt:{filename:'legacy-receipt.pdf'}});
  load.journalEntries.push({sourceId:'EXP-LEGACY'});
  harness.elements.get('v36-post-fuel').listeners.click[0]();
  assert.equal(load.expenses.length,1,'legacy fuel expense is updated by linked snapshot instead of duplicated');
  assert.equal(load.expenses[0].id,'EXP-LEGACY','updating legacy fuel preserves its expense ID');
  assert.equal(load.expenses[0].source,'actual-trip-fuel','updated fuel uses the stable actual-trip source key');
  assert.equal(load.journalEntries.length,1,'updating legacy fuel does not duplicate its journal posting');
  assert.equal(load.expenses[0].receipt.filename,'legacy-receipt.pdf','updating legacy fuel preserves receipt evidence');
}


// Rendering must keep different load IDs separate without changing saved records.
{
  const first={snapshotId:'ACT-LOAD1',loadId:'FLT-TRIP-1',createdAt:'2026-10-15T10:00:00.000Z',truckId:'TRUCK-1',truckUnit:'Truck 1',actualMiles:100,actualGallons:20,actualMpg:5};
  const another={...first,snapshotId:'ACT-LOAD2',loadId:'FLT-TRIP-2',createdAt:'2026-10-16T10:00:00.000Z',actualMiles:160,actualGallons:20,actualMpg:8};
  const load=makeLoad([first]),other=makeLoad([another]);other.id='FLT-TRIP-2';
  const harness=createHarness(load);
  harness.sandbox.store.loads.push(other);
  harness.sandbox.renderFinance();
  assert.equal(harness.elements.get('v36-history-count').textContent,'2 trips','distinct load IDs must retain separate MPG-history rows');
  assert.equal(load.actualTripRecords.length,1,'history rendering must not rewrite the first load');
  assert.equal(other.actualTripRecords.length,1,'history rendering must not rewrite the second load');
}

// Historical MPG views are non-destructive: multiple snapshots within a load
// resolve to its latest displayed trip, but other Load IDs remain distinct.
{
  const first={snapshotId:'ACT-ONE',loadId:'FLT-TRIP-1',createdAt:'2026-10-10T10:00:00.000Z',truckId:'TRUCK-1',truckUnit:'Truck 1',actualMiles:100,actualGallons:20,actualMpg:5};
  const second={...first,snapshotId:'ACT-TWO',createdAt:'2026-10-11T10:00:00.000Z',actualMiles:120,actualMpg:6};
  const other={...first,snapshotId:'ACT-OTHER',loadId:'FLT-TRIP-2',createdAt:'2026-10-12T10:00:00.000Z',actualMiles:140,actualMpg:7};
  const load=makeLoad([first,second]),otherLoad={...makeLoad([other]),id:'FLT-TRIP-2'};
  const harness=createHarness(load);
  harness.sandbox.store.loads.push(otherLoad);
  harness.sandbox.renderFinance();
  assert.equal(harness.elements.get('v36-history-count').textContent,'2 trips','different Load IDs remain distinct in MPG history');
  const rendered=harness.elements.get('v36-mpg-history').innerHTML;
  assert.ok(rendered.includes('6.00 MPG'),'latest snapshot of first Load ID is displayed');
  assert.ok(rendered.includes('7.00 MPG'),'second Load ID is displayed independently');
  assert.equal(load.actualTripRecords.length,2,'both historical snapshots remain stored');
  assert.equal(otherLoad.actualTripRecords.length,1,'other load history remains stored');
}

assert.match(expenseSource,/item=>item\.source===entry\.source\|\|\(entry\.linkedSnapshotId&&item\.linkedSnapshotId===entry\.linkedSnapshotId\)/,'expense confirmation must upsert by stable source or linked snapshot ID');
assert.ok(hardfixSource.includes('required to complete Actual Trip Cost'),'truck repair uses the current Actual Trip Cost label');

console.log('V3.8 Actual Trip snapshot, toll persistence, MPG history, and fuel expense idempotency regression checks passed.');
