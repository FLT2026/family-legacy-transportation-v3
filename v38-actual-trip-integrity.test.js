const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('v36-actual-trip.js','utf8');
const expenseSource=fs.readFileSync('index.html','utf8');
const hardfixSource=fs.readFileSync('v38-v36-autopopulate-hardfix.js','utf8');

const verifiedTruck={id:'TRUCK-1',unit:'Truck 1',status:'active'};
const defaultStorage=()=>({
  'flt-v35-estimate-snapshots':'[]',
  'flt-v35-fleet':JSON.stringify({trucks:[verifiedTruck],locks:[{id:'LOCK-1',loadId:'FLT-TRIP-1',truckId:'TRUCK-1',truckUnit:'Truck 1'}]})
});

function createHarness(load,storage=defaultStorage()){
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
  const ids=['v36-record-status','v36-actual-mpg','v36-truck-label','v36-cost-variance','v36-cost-detail','v36-mile-variance','v36-mile-detail','v36-post-fuel','v36-evidence','v36-evidence-status','v36-history-count','v36-mpg-history','v36-reconciliation','v36-reconciliation-status','v36-gate-checks','v36-gate-status','v36-use-estimate','v36-truck-notice','clock'];
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
  const toasts=[];
  const localStorage={
    getItem(key){return Object.prototype.hasOwnProperty.call(storage,key)?storage[key]:null},
    setItem(key,value){storage[key]=String(value)}
  };
  sandbox={
    document,window,localStorage,FormData:formData,
    store:{loads:[load]},
    current:()=>load,
    persist(){},
    toast(message){toasts.push(message)},
    renderFinance(){},
    setTimeout(callback){callback()},
    Date
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return{sandbox,elements,form,load,toasts,storage};
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

// ---- Truck-assignment integrity -------------------------------------------------------
const tripFleet=(locks=[],trucks=[verifiedTruck,{id:'TRUCK-2',unit:'Truck 2',status:'active'}])=>JSON.stringify({trucks,locks});
const assignmentsFor=(truckId,status='Verified / Locked')=>JSON.stringify({assignments:[{id:'ASN-1',loadId:'FLT-TRIP-1',driverId:'D1',truckId,trailerId:'R1',status}],assignmentAudit:[]});

// Missing assignment: no dispatch assignment, lock, or linked accepted estimate.
{
  const load=makeLoad(),harness=createHarness(load,{'flt-v35-fleet':tripFleet([])});
  const notice=harness.elements.get('v36-truck-notice');
  assert.equal(notice.hidden,false,'missing truck assignment shows a correction message before saving');
  assert.match(notice.textContent,/cannot be verified/i,'correction message states the truck cannot be verified');
  assert.match(notice.textContent,/Dispatch Control/,'correction message tells the operator how to fix it');
  assert.notEqual(harness.elements.get('v36-truck-label').textContent,'No assigned truck','truck label no longer shows the ambiguous legacy text');
  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,0,'no MPG snapshot is created without a verified truck');
  assert.equal(load.expenses.length,0,'no fuel expense is opened when the snapshot is blocked');
  assert.ok(harness.toasts.some(message=>/cannot be verified/i.test(message)),'blocked save explains why');
  assert.equal(harness.sandbox.window.FLTActualTripTruck.resolve(load).status,'missing');
}

// An unlinked estimate snapshot (another load's latest estimate) is never used as this load's truck.
{
  const load=makeLoad(),harness=createHarness(load,{'flt-v35-fleet':tripFleet([]),'flt-v35-estimate-snapshots':JSON.stringify([{snapshotId:'EST-OTHER',decision:'ACCEPT LOAD',selectedFleet:{truckId:'TRUCK-1',truckUnit:'Truck 1'}}])});
  assert.equal(harness.sandbox.window.FLTActualTripTruck.resolve(load).status,'missing','an estimate that is not linked to this Load ID is ignored');
}

// Verified V3.8 dispatch assignment (no legacy lock) resolves the truck and records it.
{
  const load=makeLoad(),harness=createHarness(load,{'flt-v35-fleet':tripFleet([]),'flt-v38-assignments':assignmentsFor('TRUCK-1')});
  assert.equal(harness.elements.get('v36-truck-notice').hidden,true,'verified assignment shows no correction message');
  assert.match(harness.elements.get('v36-truck-label').textContent,/Truck 1/,'Actual Trip displays the verified truck');
  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,1,'verified truck allows the MPG snapshot');
  assert.equal(load.actualTripRecords[0].truckId,'TRUCK-1','snapshot records the verified truck ID');
  assert.equal(load.actualTripRecords[0].truckUnit,'Truck 1','snapshot records the verified truck unit');
  assert.deepEqual([...load.actualTripRecords[0].truckSources],['Dispatch assignment'],'snapshot records which record verified the truck');
}

// Superseded or cancelled assignments are not treated as verified.
{
  const load=makeLoad(),harness=createHarness(load,{'flt-v35-fleet':tripFleet([]),'flt-v38-assignments':assignmentsFor('TRUCK-1','Cancelled')});
  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,0,'cancelled assignment cannot authorize MPG history');
}

// Accepted estimate linked to the load (acceptedEquipment) agrees with the dispatch lock.
{
  const load={...makeLoad(),acceptedEquipment:{truckId:'TRUCK-1',truckUnit:'Truck 1',estimateSnapshotId:'EST-1'}},harness=createHarness(load);
  submitTrip(harness);
  assert.equal(load.actualTripRecords[0].truckId,'TRUCK-1','matching estimate and lock verify the truck');
  assert.deepEqual([...load.actualTripRecords[0].truckSources],['Dispatch lock','Accepted estimate']);
}

// Conflicting assignments are detected, never silently resolved.
{
  const load=makeLoad(),harness=createHarness(load,{'flt-v35-fleet':tripFleet([{id:'LOCK-1',loadId:'FLT-TRIP-1',truckId:'TRUCK-2',truckUnit:'Truck 2'}]),'flt-v38-assignments':assignmentsFor('TRUCK-1')});
  const result=harness.sandbox.window.FLTActualTripTruck.resolve(load);
  assert.equal(result.status,'conflict','assignment and lock naming different trucks is a conflict');
  assert.equal(result.truckId,null,'a conflict never selects a truck');
  assert.match(harness.elements.get('v36-truck-notice').textContent,/conflict[\s\S]*Truck 1[\s\S]*Truck 2|conflict[\s\S]*Truck 2[\s\S]*Truck 1/i,'conflict message names both trucks');
  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,0,'conflicting truck records block the MPG snapshot');
}
{
  const load={...makeLoad(),acceptedEquipment:{truckId:'TRUCK-2',truckUnit:'Truck 2'}},harness=createHarness(load);
  assert.equal(harness.sandbox.window.FLTActualTripTruck.resolve(load).status,'conflict','accepted estimate truck differing from the dispatch lock is a conflict');
  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,0,'estimate/dispatch conflict blocks the MPG snapshot');
}

// A truck that is not Active / Verified in Drivers & Equipment cannot receive MPG history.
{
  const load=makeLoad(),harness=createHarness(load,{'flt-v35-fleet':tripFleet([{id:'LOCK-1',loadId:'FLT-TRIP-1',truckId:'TRUCK-3',truckUnit:'Truck 3'}],[{id:'TRUCK-3',unit:'Truck 3',status:'planned'}])});
  assert.equal(harness.sandbox.window.FLTActualTripTruck.resolve(load).status,'unverified');
  submitTrip(harness);
  assert.equal(load.actualTripRecords.length,0,'unverified truck blocks the MPG snapshot');
}

// Historical snapshots keep their original truck IDs, including missing ones; nothing back-fills them.
{
  const legacy={snapshotId:'ACT-NULL',loadId:'FLT-TRIP-1',createdAt:'2026-10-14T10:00:00.000Z',actualMiles:120,actualGallons:20,actualMpg:6,truckId:null,truckUnit:null};
  const original={snapshotId:'ACT-ORIG',loadId:'FLT-TRIP-2',createdAt:'2026-10-13T10:00:00.000Z',actualMiles:100,actualGallons:20,actualMpg:5,truckId:'TRUCK-OLD',truckUnit:'Retired Truck'};
  const load=makeLoad([legacy]),other={...makeLoad([original]),id:'FLT-TRIP-2'};
  const before=JSON.stringify([legacy,original]);
  const harness=createHarness(load,{'flt-v35-fleet':tripFleet([]),'flt-v38-assignments':assignmentsFor('TRUCK-1')});
  harness.sandbox.store.loads.push(other);
  harness.sandbox.renderFinance();
  assert.equal(JSON.stringify([load.actualTripRecords[0],other.actualTripRecords[0]]),before,'rendering never rewrites historical snapshot truck IDs');
  assert.match(harness.elements.get('v36-gate-checks').innerHTML,/Vehicle MPG history created<\/span><span class="tag gray">PENDING/,'a snapshot without a truck does not pass the MPG-history gate');

  // The autopopulate hardfix must not back-fill the truck either, and its manual repair appends a correction.
  const hardfixElements=new Map(),stub=id=>{const el={id,value:'',listeners:{},options:[],children:[],elements:{},addEventListener(type,fn){(this.listeners[type]=this.listeners[type]||[]).push(fn)},appendChild(child){this.options.push(child);return child},querySelector(){return{insertAdjacentElement(){}}},querySelectorAll(){return[]},remove(){hardfixElements.delete(this.id)},set innerHTML(html){const re=/id="([^"]+)"/g;let match;while((match=re.exec(html)))if(!hardfixElements.has(match[1]))hardfixElements.set(match[1],stub(match[1]))},get innerHTML(){return''}};return el};
  hardfixElements.set('v36-actual-form',stub('v36-actual-form'));
  const prompts=[],hardfixSandbox={window:{addEventListener(){},FLTActualTripTruck:harness.sandbox.window.FLTActualTripTruck},document:{getElementById:id=>hardfixElements.get(id)||null,createElement:()=>stub(''),querySelectorAll:()=>[]},localStorage:harness.sandbox.localStorage,Option:function(text,value){this.text=text;this.value=value},current:()=>load,persist(){},renderFinance(){},toast(){},confirm:message=>{prompts.push(message);return true},console,setTimeout:fn=>fn()};
  vm.createContext(hardfixSandbox);
  vm.runInContext(hardfixSource,hardfixSandbox);
  const hardfix=hardfixSandbox.window.FLTV36AutopopulateHardfix;
  hardfix.refresh();
  assert.equal(load.actualTripRecords.length,1,'hardfix refresh adds no snapshot');
  assert.equal(load.actualTripRecords[0].truckId,null,'hardfix refresh does not back-fill a missing historical truck ID');
  assert.equal(hardfix.linkTruckToSnapshot('TRUCK-2'),false,'manual repair cannot link a truck that contradicts the verified dispatch record');
  assert.equal(hardfix.linkTruckToSnapshot('TRUCK-1'),true,'operator-confirmed repair to the verified truck is accepted');
  assert.equal(prompts.length,1,'manual repair requires confirmation');
  assert.equal(load.actualTripRecords.length,2,'repair appends a correction snapshot');
  assert.equal(JSON.stringify(load.actualTripRecords[0]),JSON.stringify(legacy),'original snapshot stays byte-for-byte unchanged');
  assert.equal(load.actualTripRecords[1].correctsSnapshotId,'ACT-NULL','correction references the original snapshot');
  assert.equal(load.actualTripRecords[1].originalCreatedAt,legacy.createdAt,'correction preserves the original trip timestamp');
  assert.equal(load.actualTripRecords[1].truckId,'TRUCK-1');
  const audit=JSON.parse(harness.storage['flt-v35-fleet']).audit.at(-1);
  assert.equal(audit.entity,'actual_trip','repair is recorded in audit history');
  assert.equal(audit.before.snapshotId,'ACT-NULL');
  const closedLoad={...makeLoad([{...legacy}]),financialClose:{status:'Closed',snapshot:{}}};
  hardfixSandbox.current=()=>closedLoad;
  assert.equal(hardfix.linkTruckToSnapshot('TRUCK-1'),false,'closed loads block truck repair until a protected correction is opened');
  assert.equal(closedLoad.actualTripRecords.length,1);
}

assert.match(expenseSource,/load\.expenses\.findIndex\(item=>[\s\S]*?item\.source===entry\.source[\s\S]*?item\.linkedSnapshotId===entry\.linkedSnapshotId\)/,'expense confirmation must upsert by stable source or linked snapshot ID');
assert.ok(hardfixSource.includes('required to complete Actual Trip Cost'),'truck repair uses the current Actual Trip Cost label');

console.log('V3.8 Actual Trip snapshot, toll persistence, MPG history, fuel expense idempotency, and truck-assignment integrity (missing/verified/conflict/unverified/historical preservation/correction) regression checks passed.');
