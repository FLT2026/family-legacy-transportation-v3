// Focused V3.8 duplicate-save regression: exercise the actual create handlers
// extracted from fleet-core.js in a minimal simulated DOM, without browser data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'fleet-core.js'),'utf8');
const start=src.indexOf("  // Each new-record form accepts one successful create per explicit session.");
const end=src.indexOf("  document.getElementById('fleet-lock-form')",start);
assert(start>=0&&end>start,'create handler exists');
const handler=src.slice(start,end);
for(const type of ['driver','truck','trailer']){
  const bucket=type+'s';
  const listeners={};
  const form={
    dataset:{},events:{},resetCount:0,
    addEventListener(name,fn){this.events[name]=fn;},
    appendChild(node){this.again=node;},
    reset(){this.resetCount++;}
  };
  const document={
    getElementById(id){assert.equal(id,'fleet-'+type+'-form');return form;},
    createElement(){return {hidden:false,addEventListener(name,fn){this.click=fn;}};}
  };
  const initial={drivers:[{id:'existing-driver'}],trucks:[{id:'existing-truck'}],trailers:[{id:'existing-trailer'}],audit:[{id:'audit-1'}]};
  let data=structuredClone(initial),writes=0,fail=false,sequence=0;
  const localStorage={setItem(key,value){assert.equal(key,'flt-v35-fleet');if(fail)throw Error('quota');writes++;this.saved=JSON.parse(value);}};
  const sandbox={
    document,localStorage,data,
    item:()=>({id:type+'-'+(++sequence),status:'planned'}),
    render:()=>{},applyDriverDefaults:()=>{},toast:()=>{},
    driverEligibility:()=>({eligible:false,label:'Planned'}),
    assetEligibility:()=>({eligible:true})
  };
  // VM globals are independent of this test's own lexical scope.
  vm.createContext(sandbox);
  vm.runInContext(handler,sandbox);
  const submit=()=>form.events.submit({preventDefault(){}});
  for(let n=0;n<5;n++)submit();
  assert.equal(writes,1,type+' rapid submissions must persist only once');
  assert.equal(sandbox.data[bucket].length,2);
  assert.equal(form.again.hidden,false);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.data.audit)),initial.audit);
  form.again.click();
  assert.equal(form.resetCount,2,'new session resets form intentionally');
  submit();
  assert.equal(writes,2,type+' explicit Add Another allows second record');
  assert.notEqual(sandbox.data[bucket][1].id,sandbox.data[bucket][2].id);
  assert.equal(sandbox.data[bucket][0].id,initial[bucket][0].id);
  assert.equal(localStorage.saved[bucket].length,3,'records persist in stored snapshot');
  form.again.click();
  fail=true;
  submit();
  assert.equal(sandbox.data[bucket].length,3,'storage failure must not append phantom');
  assert.equal(writes,2);
  fail=false;
  submit();
  assert.equal(writes,3,'failed save can retry');
  assert.equal(sandbox.data[bucket].length,4);
  // An authorized edit remains owned by the separate capture-phase master handler.
  form.again.click();
  form.dataset.editId='existing-id';
  submit();
  assert.equal(writes,3,type+' edit must not invoke create handler');
  assert.equal(sandbox.data.drivers[0].id,'existing-driver');
  assert.equal(sandbox.data.trucks[0].id,'existing-truck');
  assert.equal(sandbox.data.trailers[0].id,'existing-trailer');
}
console.log('V3.8 duplicate-save guard: driver/truck/trailer rapid save, intentional new record, storage failure, edit isolation and preservation passed.');
