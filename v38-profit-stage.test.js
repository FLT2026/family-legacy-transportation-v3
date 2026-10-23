const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('v38-profit-stage.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const modules=fs.readFileSync('fleet-module.js','utf8');

function element(text=''){return{textContent:text,style:{},dataset:{},title:'',querySelector:()=>null,querySelectorAll:()=>[]}}
function harness(load){
  const rows=[0,1,2,3].map(()=>{const row=element(),label=element('Label'),value=element('$0');row.querySelector=selector=>selector==='span'?label:selector==='strong'?value:null;return{row,label,value}});
  rows[2].value.textContent='+$40.00 over estimate';
  rows[3].value.textContent='$1,000.00';
  const card=element(),cardTitle=element('Final profit');
  card.querySelector=selector=>selector==='h2'?cardTitle:null;
  card.querySelectorAll=selector=>selector==='.metric-row'?rows.map(item=>item.row):[];
  const stat=element(),statLabel=element('Recorded profit'),statTrend=element(''),statValue=element('$1,000.00');
  stat.querySelector=selector=>({'.label':statLabel,'.trend':statTrend,'.value':statValue}[selector]||null);
  const receivableLabel=element('Invoice balance');
  const lookup={'#finance > .grid.two > .panel:nth-child(2)':card,'#finance .stat:nth-child(3)':stat,'#finance .stat:nth-child(4) .label':receivableLabel};
  let renders=0;
  const sandbox={window:{},document:{querySelector:selector=>lookup[selector]||null},current:()=>load,console};
  sandbox.renderFinance=()=>{renders++;rows[3].value.textContent='$1,000.00'};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return{sandbox,api:sandbox.window.FLTProfitStage,cardTitle,rows,statLabel,statTrend,statValue,receivableLabel,card,renders:()=>renders};
}

const base=()=>({id:'FLT-PROFIT-1',revenue:1000,estimatedRevenue:1000,expenses:[],actualTripRecords:[]});

// Revenue with zero recorded expenses must never be represented as verified or final profit.
let load=base(),h=harness(load);
assert.equal(h.api.stage(load).key,'provisional');
assert.equal(h.cardTitle.textContent,'Provisional profit');
assert.equal(h.rows[3].label.textContent,'Provisional profit (recorded expenses only)');
assert.equal(h.statLabel.textContent,'Provisional profit');
assert.equal(h.statTrend.textContent,'Provisional — unrecorded costs are excluded');
assert.match(h.rows[2].value.textContent,/over estimate \(provisional — actual costs incomplete\)$/,'variance must be marked provisional while actuals are incomplete');
assert.equal(h.rows[3].value.textContent,'$1,000.00','profit formula output must remain unchanged');
assert.equal(h.statValue.textContent,'$1,000.00','profit stat value must remain unchanged');
assert.match(h.card.title,/Recorded operating expenses/);
assert.match(h.card.title,/Actual Trip mileage and fuel snapshot/);
assert.equal(h.receivableLabel.textContent,'Unbilled revenue');

// Re-rendering wraps once and does not append the provisional suffix twice.
h.sandbox.renderFinance();h.sandbox.renderFinance();
assert.equal(h.renders(),2);
assert.equal((h.rows[2].value.textContent.match(/provisional — actual costs incomplete/g)||[]).length,1);

// A snapshot with expenses but no verified truck stays provisional.
load=base();load.expenses=[{category:'Fuel',amount:300,receipt:{filename:'fuel.pdf'}},{category:'Tolls',amount:20}];
load.actualTripRecords=[{snapshotId:'ACT-1',actualMiles:500,actualGallons:60,truckId:null}];
assert.equal(harness(load).api.stage(load).key,'provisional');
assert.deepEqual(Array.from(harness(load).api.stage(load).missing),['Verified truck on the Actual Trip snapshot']);

// Missing receipts or toll status keep the figure provisional.
load=base();load.expenses=[{category:'Fuel',amount:300}];load.actualTripRecords=[{actualMiles:500,actualGallons:60,truckId:'TRK-01'}];
assert.deepEqual(Array.from(harness(load).api.stage(load).missing),['Toll status','Receipt evidence']);

// Complete actual costs are labeled Actual profit (not final until financial close).
load=base();load.expenses=[{category:'Fuel',amount:300,receipt:{filename:'fuel.pdf'}}];load.actualTripRecords=[{actualMiles:500,actualGallons:60,truckId:'TRK-01',noTollsIncurred:true}];
h=harness(load);
assert.equal(h.api.stage(load).key,'actual');
assert.equal(h.cardTitle.textContent,'Actual profit');
assert.equal(h.rows[3].label.textContent,'Actual profit (actual trip costs recorded)');
assert.equal(h.statLabel.textContent,'Actual profit');
assert.equal(h.rows[2].value.textContent,'+$40.00 over estimate','estimate variance is retained without the provisional suffix');

// Only a financially closed load with a locked snapshot is Final earned profit.
load.financialClose={status:'Correction Open',snapshot:{profit:700}};
assert.equal(harness(load).api.stage(load).key,'actual','an open correction is not final');
load.financialClose={status:'Closed',snapshot:{profit:700}};
h=harness(load);
assert.equal(h.api.stage(load).key,'final');
assert.equal(h.cardTitle.textContent,'Final earned profit');
assert.equal(h.statLabel.textContent,'Final earned profit');

// Receivable labels distinguish draft invoices from finalized receivables.
assert.equal(h.api.receivableLabel({invoice:{number:'INV-1',status:'Draft'}}),'Unbilled revenue (invoice is a draft)');
assert.equal(h.api.receivableLabel({invoice:{number:'INV-1',status:'Finalized',finalizedAt:'2026-10-22T00:00:00Z'}}),'Receivable balance');

// Static markup must not claim final profit before the selected load is evaluated.
const close=fs.readFileSync('v37-financial-close.js','utf8');
assert.match(close,/\(closed\?'Final earned profit':'Provisional profit \(recorded costs only\)'\)/,'financial close panel must only say Final earned profit once the load is closed');
assert.doesNotMatch(html,/<h2>Final profit<\/h2>/);
assert.doesNotMatch(html,/<span>Final profit<\/span>/);
assert.match(modules,/'v38-profit-stage\.js\?v=\w+'\s*\]/,'profit stage module must load last so its labels are authoritative');

console.log('V3.8 profit stage labeling checks passed.');
