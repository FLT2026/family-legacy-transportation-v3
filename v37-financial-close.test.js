const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

const elements=new Map();
const element=()=>({innerHTML:'',textContent:'',className:'',childNodes:[{textContent:''}],appendChild(child){elements.set(child.id,child);},insertAdjacentElement(position,child){this.insertedPosition=position;elements.set(child.id,child);}});
const finance=element(),test=element(),header=element(),footer=element(),clock={parentElement:footer},testHeading=element(),testTitle=element(),testNav=element();
const load={id:'FLT-TEST-1',revenue:1000,invoice:{number:'INV-1'},payments:[{amount:250}],expenses:[{category:'Fuel',amount:100}],pod:true,deliveryProof:{signature:'signed'}};
const other={id:'FLT-TEST-2',revenue:500,invoice:{number:'INV-2'},payments:[{amount:600}],expenses:[],pod:true,deliveryProof:{signature:'signed'}};
const document={title:'',createElement:element,getElementById:id=>id==='clock'?clock:(elements.get(id)||null),querySelector:selector=>({'header .eyebrow':header,'#test > .panel > .section-head':testHeading,'#test > .panel > .section-head h2':testTitle,'[data-view="test"] .nav-label':testNav,'#finance':finance,'#test > .panel':test})[selector]||null};
const sandbox={document,window:{},store:{loads:[load,other]},current:()=>load,actualRevenue:item=>item.actualRevenue??item.revenue,money:value=>'$'+value.toFixed(2)};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('v37-financial-close.js','utf8'),sandbox);

const api=sandbox.window.FLTFinancialClose,result=api.reconcile(load),overpayment=api.reconcile(other);
assert.equal(document.title,'Family Legacy Commercial Command™ V3.7');assert.match(elements.get('v37-financial-close').innerHTML,/FLT-TEST-1/);assert.match(elements.get('v37-gate').innerHTML,/Financial Close Gate/);assert.equal(testHeading.insertedPosition,'afterend');
assert.deepEqual([result.invoice,result.payments,result.receivable,result.profit],[100000,25000,75000,90000]);assert.equal(result.debits,result.credits);assert.equal(overpayment.receivable,-10000);assert.equal(api.isolationCheck([load,other]),true);assert.equal(other.payments.length,1);
const itemized=api.reconcile({...load,invoice:{number:'INV-I',total:1125,lineItems:[{type:'transportation',amount:1000},{type:'accessorial',amount:125}]}});assert.equal(itemized.linesEqualInvoice,true);assert.equal(itemized.journal.find(row=>row.account==='Accessorial Revenue').credit,12500);
const credited=api.reconcile({...load,invoice:{number:'INV-C',total:975,lineItems:[{type:'transportation',amount:1000},{type:'credit',amount:-25}]}});assert.equal(credited.balanced,true);assert.equal(credited.journal.find(row=>row.account==='Revenue Adjustments').debit,2500);
const reversed=api.reconcile({...load,invoice:{number:'INV-1',total:1000},payments:[{amount:400,allocation:{invoiceNumber:'INV-1',amount:400}},{amount:-400,type:'Reversal',allocation:{invoiceNumber:'INV-1',amount:-400}}]});assert.equal(reversed.payments,0);assert.equal(reversed.receivable,100000);assert.equal(reversed.balanced,true);assert.equal(reversed.allocationsMatch,true);
const misallocated=api.reconcile({...load,invoice:{number:'INV-1',total:1000},payments:[{amount:10,allocation:{invoiceNumber:'INV-X',amount:10}}]});assert.equal(misallocated.allocationsMatch,false);assert.equal(misallocated.payments,0);
const adjustedClose=api.reconcile({...load,invoice:{number:'INV-1',total:1000},payments:[],financialAdjustments:[{invoiceNumber:'INV-1',type:'Credit',amount:-50}]});assert.equal(adjustedClose.receivable,95000);assert.equal(adjustedClose.profit,85000);assert.equal(adjustedClose.balanced,true);

const settled={id:'FLT-CLOSE-1',invoice:{number:'INV-CLOSE',status:'Finalized',total:1000,lineItems:[{type:'transportation',amount:1000}]},payments:[{id:'PAY-1',amount:1000,allocation:{invoiceNumber:'INV-CLOSE',amount:1000}}],expenses:[{id:'EXP-1',category:'Fuel',amount:100}],financialAdjustments:[],journalEntries:[],pod:true,deliveryProof:{signature:'signed'}};
assert.equal(api.closeEligibility(settled,[settled]).pass,true);const closed=api.closeLoad(settled,{loads:[settled],now:new Date('2026-09-08T12:00:00Z')});assert.equal(closed.ok,true);assert.equal(settled.financialClose.status,'Closed');assert.equal(settled.financialClose.closedAt,'2026-09-08T12:00:00.000Z');assert.equal(api.auditClosed(settled).pass,true);assert.throws(()=>api.assertEditable(settled),/financial close lock/);
settled.expenses[0].amount=101;assert.equal(api.auditClosed(settled).pass,false);
const unpaid={...settled,id:'FLT-OPEN-1',financialClose:undefined,expenses:[],payments:[]};assert.equal(api.closeEligibility(unpaid,[unpaid]).settled,false);assert.equal(api.closeLoad(unpaid,{loads:[unpaid]}).ok,false);
console.log('V3.7 render, reconciliation, settlement, protected close, drift, and isolation checks passed.');
