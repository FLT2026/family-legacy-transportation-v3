const assert=require('node:assert');const fs=require('node:fs');const vm=require('node:vm');
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('v38-autopopulate-audit.js','utf8'),sandbox);const api=sandbox.window.FLTAutoPopulateAudit;
const load={id:'FLT-AUTO-1',customerName:'Direct Customer',customerAddress:{street:'10 Billing Rd',city:'Raleigh',state:'NC',zip:'27601'},pickup:'Raleigh, NC',pickupAddress:{facility:'Pickup Warehouse',street:'100 Pickup St',city:'Raleigh',state:'NC',zip:'27603'},delivery:'Charlotte, NC',deliveryAddress:{facility:'Delivery Warehouse',street:'200 Delivery Ave',city:'Charlotte',state:'NC',zip:'28202'},sourceType:'Load Board',sourceName:'Test Board',sourceReference:'LB-77',transportationType:'General Freight',loadedMiles:150,deadheadMiles:20,returnDeadheadMiles:10,revenue:1250,expenses:[{amount:100},{amount:50}],payments:[{amount:500}],pickupProof:{signature:'P'},deliveryProof:{signature:'D'},invoice:{id:'INV-1'}};
const fleet={drivers:[{id:'D1',name:'Owner Driver'}],trucks:[{id:'T1',unit:'Truck 1'}],trailers:[{id:'R1',unit:'Trailer 1'}]};const assignment={id:'A1',status:'Verified / Locked',driverId:'D1',truckId:'T1',trailerId:'R1'};const business={legalName:'Family Legacy Transportation',usdot:'123456'};
let result=api.audit({load,fleet,assignment,business});assert.equal(result.pass,true);assert.equal(result.status,'PASS');assert.equal(result.data.loadId,load.id);assert.equal(result.data.customer.name,'Direct Customer');assert.equal(result.data.customer.address.zip,'27601');assert.equal(result.data.route.pickupAddress.facility,'Pickup Warehouse');assert.equal(result.data.route.pickupAddress.street,'100 Pickup St');assert.equal(result.data.route.pickupAddress.zip,'27603');assert.equal(result.data.route.deliveryAddress.facility,'Delivery Warehouse');assert.equal(result.data.route.deliveryAddress.street,'200 Delivery Ave');assert.equal(result.data.route.deliveryAddress.zip,'28202');assert.equal(result.data.operations.pickupAddress.zip,'27603');assert.equal(result.data.operations.deliveryAddress.zip,'28202');assert.equal(result.data.finance.billingAddress.zip,'27601');assert.equal(result.data.assignment.driver.name,'Owner Driver');assert.equal(result.data.mileage.loaded,150);assert.equal(result.data.mileage.total,180);assert.equal(result.data.finance.revenue,1250);assert.equal(result.data.finance.totalExpenses,150);assert.equal(result.data.finance.totalPayments,500);assert.equal(result.data.finance.receivable,750);assert.equal(result.data.finance.profit,1100);assert.equal(result.data.operations.pickupProof.signature,'P');assert.equal(result.data.operations.deliveryProof.signature,'D');
const actual={...load,totalMiles:190,actualTrip:{totalMiles:190}};result=api.audit({load:actual,fleet,assignment,business});assert.equal(result.data.mileage.total,190);assert.equal(result.data.mileage.source,'saved total');
const duplicate={...load,customer:'Different Customer',totalMiles:180,mileage:181,actualRevenue:1300};result=api.audit({load:duplicate,fleet,assignment,business});assert.equal(result.pass,false);assert.ok(result.conflicts.some(x=>/Customer/.test(x)));assert.ok(result.conflicts.some(x=>/mileage/i.test(x)));assert.ok(result.conflicts.some(x=>/Revenue/.test(x)));
result=api.audit({load:{id:'FLT-MISSING',customerName:'C',pickup:'A',pickupAddress:{},delivery:'B',deliveryAddress:{},revenue:1},fleet,assignment:null,business});assert.equal(result.pass,false);assert.ok(result.issues.some(x=>/assignment/i.test(x)));assert.ok(result.issues.some(x=>/mileage/i.test(x)));assert.ok(result.issues.some(x=>/Pickup address/i.test(x)));assert.ok(result.issues.some(x=>/Delivery address/i.test(x)));
console.log('V3.8 downstream auto-populate Load-ID, customer/address, route, assignment, mileage, operations, and finance reuse checks passed.');

// Self-contained regression for v38-v36-autopopulate-hardfix.js: confirms
// ensureTruckRepair() builds the truck-repair <select> options via the DOM
// Option constructor (never string-concatenated innerHTML), so hostile
// truck unit/name/id values from saved fleet data can never be interpreted
// as markup, while normal values still populate the dropdown correctly.
{
  function Option(text,value){this.text=text;this.value=value;this.textContent=text;}

  function buildHardfixDom(trucks){
    const elements=new Map();
    function stubElement(id){
      const el={
        id,value:'',className:'',checked:false,children:[],options:[],
        listeners:{},elements:{},
        addEventListener(type,fn){(this.listeners[type]=this.listeners[type]||[]).push(fn)},
        appendChild(child){this.children.push(child);this.options.push(child);return child},
        querySelector(){return {insertAdjacentElement(){}}},
        querySelectorAll(){return []},
        remove(){elements.delete(this.id)},
        set innerHTML(html){
          this._innerHTML=html;
          const re=/id="([^"]+)"/g;let match;
          while((match=re.exec(html))){if(!elements.has(match[1]))elements.set(match[1],stubElement(match[1]))}
        },
        get innerHTML(){return this._innerHTML||''}
      };
      return el;
    }

    const form=stubElement('v36-actual-form');
    form.elements={};
    elements.set('v36-actual-form',form);

    const document={
      getElementById:id=>elements.get(id)||null,
      createElement:tag=>{const el=stubElement('');el.tagName=tag;return el},
      querySelectorAll:()=>[]
    };

    const localStorage={
      _data:{'flt-v35-fleet':JSON.stringify({trucks})},
      getItem(key){return this._data[key]??null},
      setItem(key,value){this._data[key]=String(value)}
    };

    return {elements,document,localStorage,form};
  }

  function runHardfix(trucks,load){
    const {document,localStorage,elements}=buildHardfixDom(trucks);
    const sandbox={
      window:{addEventListener(){}},document,localStorage,Option,
      current:()=>load,
      console,
      setTimeout:fn=>fn()
    };
    sandbox.globalThis=sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync('v38-v36-autopopulate-hardfix.js','utf8'),sandbox);
    sandbox.window.FLTV36AutopopulateHardfix.refresh();
    const select=elements.get('v36-truck-repair-select');
    return select;
  }

  const load={id:'FLT-REPAIR-1',actualTripRecords:[{odometerStart:1,odometerEnd:2}]};

  const hostileTrucks=[{id:'<script>window.__flt_truck_xss=true</script>',unit:'"><img src=x onerror="window.__flt_truck_xss2=true">'}];
  let select=runHardfix(hostileTrucks,load);
  assert.ok(select,'truck repair select must be created when the latest trip record is missing a truckId');
  const hostileOption=select.options.find(option=>option.value&&option.value.includes('script'));
  assert.ok(hostileOption,'hostile truck option must still be added to the select as an Option instance');
  assert.equal(hostileOption.text,'"><img src=x onerror="window.__flt_truck_xss2=true">','Option.text must hold the literal, unescaped string (safe because DOM Option APIs never parse text as markup)');
  assert.equal(hostileOption.value,'<script>window.__flt_truck_xss=true</script>','Option.value must hold the literal, unescaped string id (safe for the same reason)');

  const normalTrucks=[{id:'T1',unit:'Truck 1'}];
  select=runHardfix(normalTrucks,load);
  assert.ok(select);
  const normalOption=select.options.find(option=>option.value==='T1');
  assert.ok(normalOption,'normal truck option must populate correctly');
  assert.equal(normalOption.text,'Truck 1');
  const placeholder=select.options.find(option=>option.value==='');
  assert.ok(placeholder,'placeholder option must be present');
  assert.equal(placeholder.text,'Select the truck used for this trip');

  console.log('V3.8 autopopulate truck-repair hostile-input and normal-input select population checks passed.');
}
