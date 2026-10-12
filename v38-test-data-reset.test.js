const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

function createStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return{
    get length(){return data.size},
    key(index){return [...data.keys()][index]??null},
    getItem(key){return data.has(key)?data.get(key):null},
    setItem(key,value){data.set(String(key),String(value))},
    removeItem(key){data.delete(key)}
  };
}

const numberInputs=[{value:'0'},{value:'10000'}],checkboxes=[{checked:true},{checked:true}];
const fleetFields=['name','licenseState','expiration','endorsements','restrictions','endorsementsOther','restrictionsOther','unit','vin','year','make','model','makeOther','modelOther','makeModel','gvwr','gcwr','emptyWeight','frontGawr','rearGawr','frontTireCapacity','rearTireCapacity','frontTireSize','rearTireSize','frontColdPsi','rearColdPsi','hitchCapacity','axleCapacity','axleCapacityOther','tireCapacity','manufacturerPayload','verificationDate'];
const fleetInputs=fleetFields.map(name=>({name,type:name==='verificationDate'||name==='expiration'?'date':['makeModel','endorsements','restrictions'].includes(name)?'hidden':'text',value:'old/demo/default',defaultValue:'old/demo/default'}));
const driverChoiceInputs=['None','T','P','N','H','X','S','Other','None','E','L','Z','O','M','N','V','Other'].map(value=>({type:'checkbox',value,checked:true,defaultChecked:true}));
const selects=[
  {options:[{value:'planned',textContent:'Planned',selected:true},{value:'active',textContent:'Active',selected:false}],insertBefore(option){this.options.unshift(option)}},
  {options:[{value:'',textContent:'Select driver',selected:false},{value:'D1',textContent:'Driver One',selected:true}],insertBefore(option){this.options.unshift(option)}}
];
const fleetSelections=['licenseState','qualification','area','status','configuration','weightBasis','axleCapacity','year','make','model','v36-rig-driver','v36-rig-truck','v36-rig-trailer'].map(name=>({name,value:'previous-selection',options:[{value:'previous-selection',textContent:'Old / demo / planned',selected:true,defaultSelected:true}],closest(){return{}},insertBefore(option){this.options.unshift(option)}}));
selects.push(...fleetSelections);
const documentListeners={},windowListeners={};
const document={
  body:{},
  createElement(){return{}},
  getElementById(){return null},
  querySelector(){return null},
  querySelectorAll(selector){return selector==='#fleet input, #fleet textarea'?[...fleetInputs,...driverChoiceInputs]:selector==='input[type="number"]'?numberInputs:selector==='input[type="checkbox"]'?[...checkboxes,...driverChoiceInputs]:selector==='select'?selects:[]},
  addEventListener(name,handler){documentListeners[name]=handler}
};
let activeView='business-setup',scrollPosition={left:120,top:1800};
const animationFrames=[];
const window={history:{scrollRestoration:'auto'},scrollTo(position){scrollPosition=position},requestAnimationFrame(callback){animationFrames.push(callback)},addEventListener(name,handler){windowListeners[name]=handler}};
const localStorage=createStorage({
  'flt-v34-business-profile':'{"legalName":"Carrier"}',
  'flt-v35-classification':'{"primaryOperation":"Carrier"}',
  'flt-v35-fleet':'{"drivers":[{"id":"D1","licenseState":"TX","endorsements":"T, X, Other: State-specific, permit","restrictions":"E, V"}],"trucks":[{"id":"T1","gvwr":14000}],"trailers":[{"id":"R1","make":"Diamond C","model":"FMAX210","axleCapacity":18000}],"audit":[{}]}',
  'flt-v36-regular-rig':'{"driverId":"D1","truckId":"T1","trailerId":"R1"}',
  'flt-v35-default-fleet-selection':'{"truckId":"T1"}',
  'flt-v32-customers':'[{"id":"REAL-C","name":"Permanent Customer","isTest":false,"billingAddress":{"street":"1 Real St","city":"Raleigh","state":"NC","zip":"27601"},"pickupLocations":[{"id":"REAL-P","street":"2 Real St","city":"Raleigh","state":"NC","zip":"27601"}]},{"id":"TEST-C","name":"Fictitious Customer","isTest":true,"pickupLocations":[{"id":"TEST-P","street":"3 Test St"}]}]',
  'flt-address-book-v1':'[{"customerId":"REAL-C","street":"2 Real St","city":"Raleigh","state":"NC","zip":"27601"},{"customerId":"TEST-C","street":"3 Test St"}]',
  'flt-v38-current-working-rig':'{"driverId":"D1","truckId":"T1","trailerId":"R1"}',
  'flt-v38-suspended-regular-rig':'{"driverId":"D1","truckId":"T1","trailerId":"R1"}',
  'flt-v32-loads':'[{"id":"FLT-1"}]',
  'commercial-command-master-backup-v1':'{"schema":"protected"}',
  'commercial-command-fresh-start':'1',
  'unrelated-site-data':'keep'
});
const sessionStorage=createStorage({'flt-session-test':'clear','unrelated-session-data':'keep'});
let reloads=0,confirmations=[];
const sandbox={window,document,localStorage,sessionStorage,MutationObserver:class{observe(){}},setTimeout:callback=>callback(),location:{reload(){reloads++}},confirm:()=>confirmations.shift()??false};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('v38-test-data-reset.js','utf8'),sandbox);
const api=window.FLTTestDataReset;

windowListeners['flt:modules-loaded']();
assert.equal(activeView,'business-setup','Ordinary startup must not force Dashboard.');
assert.equal(scrollPosition.top,1800,'Ordinary startup must not force window scroll.');
assert.equal(window.history.scrollRestoration,'auto');
assert.ok(fleetInputs.every(input=>input.value==='old/demo/default'),'Ordinary startup must preserve form values.');

const savedFleet=localStorage.getItem('flt-v35-fleet'),savedBackup=localStorage.getItem('commercial-command-master-backup-v1'),savedCustomers=localStorage.getItem('flt-v32-customers'),savedBook=localStorage.getItem('flt-address-book-v1');
api.reset();
assert.equal(localStorage.getItem('flt-v32-customers'),savedCustomers,'Transaction reset must preserve customer masters exactly.');
assert.equal(localStorage.getItem('flt-address-book-v1'),savedBook,'Transaction reset must preserve saved customer addresses.');
assert.equal(localStorage.getItem('flt-v35-fleet'),savedFleet,'Transaction reset must preserve driver selections, actual truck GVWR, trailer identity, and actual axle rating exactly.');
assert.equal(localStorage.getItem('commercial-command-master-backup-v1'),savedBackup,'Transaction reset must preserve the protected backup.');
assert.ok(localStorage.getItem('flt-v34-business-profile'),'Transaction reset must preserve Business Setup.');
assert.ok(localStorage.getItem('flt-v35-fleet'),'Transaction reset must preserve fleet master records.');
assert.ok(localStorage.getItem('flt-v36-regular-rig'),'Transaction reset must preserve Regular Rig.');
assert.ok(localStorage.getItem('flt-v35-default-fleet-selection'),'Transaction reset must preserve default fleet selection.');
assert.equal(localStorage.getItem('unrelated-site-data'),'keep');
['flt-v38-current-working-rig','flt-v38-suspended-regular-rig'].forEach(key=>localStorage.setItem(key,'{"driverId":"D1","truckId":"T1","trailerId":"R1"}'));

const beforeCancel=JSON.stringify([...Array(localStorage.length)].map((_,index)=>[localStorage.key(index),localStorage.getItem(localStorage.key(index))]).sort());
confirmations=[false];
assert.equal(api.confirmFullReset(),false);
assert.equal(JSON.stringify([...Array(localStorage.length)].map((_,index)=>[localStorage.key(index),localStorage.getItem(localStorage.key(index))]).sort()),beforeCancel);
confirmations=[true,false];
assert.equal(api.confirmFullReset(),false);
assert.equal(JSON.stringify([...Array(localStorage.length)].map((_,index)=>[localStorage.key(index),localStorage.getItem(localStorage.key(index))]).sort()),beforeCancel);

confirmations=[true,true];
assert.equal(api.confirmFullReset(),true);
assert.equal(reloads,1);
assert.equal(localStorage.getItem('unrelated-site-data'),'keep');
assert.equal(sessionStorage.getItem('unrelated-session-data'),'keep');
assert.equal(localStorage.getItem('commercial-command-master-backup-v1'),null);
assert.equal(localStorage.getItem('commercial-command-fresh-start'),null);
assert.equal(localStorage.getItem('commercial-command-full-setup-reset'),'1');
assert.equal([...Array(localStorage.length)].some((_,index)=>/^flt-/i.test(localStorage.key(index))&&!['flt-v32-customers','flt-address-book-v1'].includes(localStorage.key(index))),false);
const retainedCustomers=JSON.parse(localStorage.getItem('flt-v32-customers'));
assert.deepEqual(retainedCustomers.map(customer=>customer.id),['REAL-C'],'Full development reset must remove only fictitious customer masters.');
assert.equal(retainedCustomers[0].pickupLocations[0].id,'REAL-P','Legitimate customer locations must survive.');
assert.deepEqual(JSON.parse(localStorage.getItem('flt-address-book-v1')).map(item=>item.customerId),['REAL-C']);
assert.equal([...Array(sessionStorage.length)].some((_,index)=>/^flt-/i.test(sessionStorage.key(index))),false);
['flt-v34-business-profile','flt-v35-classification','flt-v35-fleet','flt-v36-regular-rig','flt-v35-default-fleet-selection','flt-v38-current-working-rig','flt-v38-suspended-regular-rig'].forEach(key=>assert.equal(localStorage.getItem(key),null,key+' must be removed by full reset.'));

delete window.FLTTestDataReset;
sandbox.showView=name=>{activeView=name;scrollPosition={left:120,top:900}};
vm.runInContext(fs.readFileSync('v38-test-data-reset.js','utf8'),sandbox);
assert.equal(window.history.scrollRestoration,'manual');
windowListeners['flt:modules-loaded']();
assert.equal(activeView,'dashboard','Full reset reload must activate Dashboard.');
assert.equal(scrollPosition.left,0);
assert.equal(scrollPosition.top,0);
assert.equal(scrollPosition.behavior,'instant');
scrollPosition={left:120,top:1800};
windowListeners.pageshow();
assert.equal(scrollPosition.left,0,'Page-show restoration must not retain horizontal scroll.');
assert.equal(scrollPosition.top,0,'Page-show restoration must not retain vertical scroll.');
scrollPosition={left:120,top:1800};
animationFrames.shift()();
assert.equal(scrollPosition.left,0);
assert.equal(scrollPosition.top,0);
assert.equal(sessionStorage.getItem('commercial-command-reset-dashboard-top'),null,'Landing request must be consumed after reload.');
fleetInputs.forEach(input=>{
  assert.equal(input.value,'',input.name+' must be blank after full reset, including hidden fields.');
  assert.equal(input.defaultValue,'',input.name+' must not return on form.reset().');
});
assert.deepEqual(numberInputs.map(input=>input.value),['','']);
assert.deepEqual(checkboxes.map(input=>input.checked),[false,false]);
driverChoiceInputs.forEach(input=>{
  assert.equal(input.checked,false,input.value+' must not be selected after full reset.');
  assert.equal(input.defaultChecked,false,input.value+' must not return after form.reset().');
});
fleetSelections.forEach(select=>{
  assert.equal(select.options.find(option=>option.selected)?.value,'',select.name+' must be unselected after full reset.');
  assert.equal(select.options.find(option=>option.defaultSelected)?.value,'',select.name+' must remain unselected after form.reset().');
});
assert.deepEqual(selects.slice(0,2).map(select=>select.value||select.options.find(option=>option.selected)?.value||''),['','']);
assert.ok(selects.every(select=>select.options.some(option=>option.value===''&&/^select/i.test(option.textContent))));
vm.runInContext(fs.readFileSync('v38-protected-master-backup.js','utf8'),sandbox);
assert.ok(window.FLTProtectedMasterBackup.collect().data['flt-v32-customers'],'Protected backup must include Customer Master.');
const customerBeforeLegacyRestore=localStorage.getItem('flt-v32-customers');
localStorage.setItem('commercial-command-master-backup-v1',JSON.stringify({schema:'FLT-PROTECTED-MASTER-BACKUP-1',data:{'flt-v35-fleet':'{"drivers":[],"trucks":[],"trailers":[],"audit":[]}'}}));
confirmations=[true];
assert.equal(window.FLTProtectedMasterBackup.restore(),true);
assert.equal(localStorage.getItem('flt-v32-customers'),customerBeforeLegacyRestore,'Restoring an older backup without customers must not erase current Customer Master.');
console.log('V3.8 full setup/test reset confirmation, storage isolation, transaction-reset preservation, and fresh-control checks passed.');