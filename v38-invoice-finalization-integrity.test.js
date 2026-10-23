const assert=require('node:assert');
const fs=require('node:fs');
const vm=require('node:vm');

// Runs the real V3.8 delivery-integrity, V3.7 itemized-invoice, and V3.7 payments modules
// together so invoice finalization is exercised through the same gates as the live app.
const elements=new Map();
const element=(id='')=>({id,innerHTML:'',className:'',parentElement:null,addEventListener(){},querySelectorAll(){return[]},appendChild(child){child.parentElement=this;elements.set(child.id,child)},insertBefore(child){child.parentElement=this;elements.set(child.id,child)}});
const finance=element('finance'),close=element('v37-financial-close');close.parentElement=finance;elements.set(close.id,close);
const document={createElement:()=>element(),getElementById:id=>elements.get(id)||null,querySelector:selector=>selector==='#finance'?finance:null};

const load={id:'FLT-INV-1',customer:'Acme Freight',billingAddress:{city:'Raleigh',state:'NC'},pickup:'Durham, NC',delivery:'Charlotte, NC',revenue:1000,paymentTerms:'Net 15',accessorialEvents:[],credits:[],payments:[],expenses:[],documents:[],pickupProof:null,deliveryProof:null};
const other={id:'FLT-INV-2',revenue:500,payments:[],expenses:[]};
const toasts=[];
const sandbox={document,window:{},store:{loads:[load,other]},current:()=>load,money:value=>'$'+Number(value).toFixed(2),persist(){},toast(message){toasts.push(message)},confirm:()=>true,Date};
vm.createContext(sandbox);
['v38-pickup-delivery-integrity.js','v37-itemized-invoice.js','v37-payments-receivables.js'].forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),sandbox));
const invoices=sandbox.window.FLTItemizedInvoice,payments=sandbox.window.FLTPaymentsReceivables;
let printed='';
sandbox.window.open=()=>({document:{write(value){printed+=value},close(){}},focus(){},print(){}});
const finalize=target=>invoices.finalize(target,{confirm:()=>true,now:new Date('2026-10-20T12:00:00Z')});

// 1. A draft may be prepared before delivery, and it is clearly a draft everywhere it is shown.
invoices.prepare(load,sandbox.store.loads,'2026-10-18');
assert.equal(load.invoice.status,'Draft','invoice draft can be prepared before delivery');
assert.equal(load.invoice.loadId,'FLT-INV-1','draft is tied to its Load ID');
invoices.render();
const panel=elements.get('v37-itemized-invoice').innerHTML;
assert.match(panel,/>DRAFT</,'invoice panel tags the draft');
assert.match(panel,/DRAFT — not a final invoice/,'invoice panel explains the draft is not final');
printed='';
assert.equal(invoices.printInvoice(load),true,'a draft can still be previewed');
assert.match(printed,/DRAFT &mdash; NOT A FINAL INVOICE/,'printed draft carries a draft banner');
assert.match(printed,/DRAFT INVOICE INV-/,'printed draft heading says DRAFT INVOICE');
assert.match(printed,/<title>DRAFT /,'printed/downloaded draft file title starts with DRAFT');
assert.match(printed,/Draft balance \(not payable\)/,'printed draft is not presented as an amount due');
assert.doesNotMatch(printed,/Amount due/,'printed draft never says Amount due');

// 2. Payments are blocked against a draft invoice.
const draftPayment=payments.recordPayment(load,{amount:100,date:'2026-10-19',method:'ACH'});
assert.equal(draftPayment.ok,false,'payments require a finalized invoice');
assert.equal(load.payments.length,0,'no payment is stored against a draft');

// 3. No delivery signature: finalization is blocked.
assert.equal(finalize(load).reason,'Signed POD is required before finalization.');
assert.equal(load.invoice.status,'Draft');

// 4. Alternate path bypass: the legacy POD flag (set by downloading a POD summary) plus a
//    signature string is not enough without complete V3.8 delivery integrity.
load.pod=true;
load.deliveryProof={signature:'data:image/png;base64,SIGNED'};
let result=finalize(load);
assert.equal(result.ok,false,'legacy POD flag cannot bypass V3.8 delivery integrity');
assert.match(result.reason,/^Delivery proof is incomplete:/,'finalization explains incomplete delivery proof');
assert.match(result.reason,/Delivery receiver name is required/,'missing receiver name is reported');
assert.match(result.reason,/Attach a POD/,'missing delivery document is reported');
assert.equal(load.invoice.status,'Draft','blocked finalization leaves the draft unchanged');
assert.equal(load.invoice.finalizedAt,undefined,'blocked finalization does not stamp finalizedAt');

// 5. Documents attached to a different Load ID do not satisfy this load's delivery proof.
load.pickupProof={signature:'data:image/png;base64,PICKUP',name:'Shipper',time:'08:00'};
load.deliveryProof={signature:'data:image/png;base64,SIGNED',name:'Receiver',time:'15:00'};
load.documents=[
  {id:'DOC-P',loadId:'FLT-INV-1',stage:'pickup',type:'Bill of Lading / Shipping Document',status:'Active'},
  {id:'DOC-D-OTHER',loadId:'FLT-INV-2',stage:'delivery',type:'Proof of Delivery',status:'Active'}
];
result=finalize(load);
assert.equal(result.ok,false,'a POD attached to another Load ID does not count');
assert.match(result.reason,/Attach a POD/);

// 6. An invoice that names a different Load ID can never be finalized or printed for this load.
load.documents.push({id:'DOC-D',loadId:'FLT-INV-1',stage:'delivery',type:'Proof of Delivery',status:'Active'});
const misfiled={...load,id:'FLT-INV-2',invoice:{...load.invoice}};
assert.match(finalize(misfiled).reason,/belongs to Load FLT-INV-1/,'invoice cannot be finalized under a different Load ID');
assert.equal(invoices.printInvoice(misfiled),false,'invoice cannot be printed under a different Load ID');

// 7. Complete, signed delivery proof on this Load ID allows finalization; the final print is not a draft.
result=finalize(load);
assert.equal(result.ok,true,'complete signed delivery proof allows finalization');
assert.equal(load.invoice.status,'Finalized');
assert.equal(load.invoice.loadId,'FLT-INV-1','finalized invoice stays on its Load ID');
printed='';
assert.equal(invoices.printInvoice(load),true);
assert.doesNotMatch(printed,/DRAFT/,'finalized invoice print has no draft marking');
assert.match(printed,/Amount due/,'finalized invoice print shows the amount due');
const paid=payments.recordPayment(load,{amount:400,date:'2026-10-21',method:'ACH'},{id:'PAY-INV-1'});
assert.equal(paid.ok,true,'payments are accepted after finalization');
assert.equal(paid.payment.allocation.invoiceNumber,load.invoice.number,'payment is allocated to this load\'s invoice');

// 8. The legacy POD download path cannot mark an unsigned delivery as a completed POD.
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/if\(!load\.deliveryProof\.signature\)\{toast\('POD summary downloaded\. Delivery signature is still pending[^']*'\);return\}load\.pod=true/,'POD download sets load.pod only after a delivery signature exists');

console.log('V3.8 invoice finalization integrity: draft labeling, payment block, POD bypass, Load-ID isolation, and finalized print checks passed.');
