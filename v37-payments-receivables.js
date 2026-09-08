(() => {
  const cents=value=>Math.round((Number(value)||0)*100);
  const amount=value=>cents(value)/100;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const currency=value=>typeof money==='function'?money(Number(value)||0):'$'+(Number(value)||0).toFixed(2);
  const makeId=(prefix,load,index=0)=>prefix+'-'+String(load?.id||'LOAD').replace(/[^A-Z0-9]/gi,'')+'-'+Date.now().toString(36)+'-'+String(index+1).padStart(2,'0');

  function normalizePayments(load){
    if(!load)return false;load.payments=Array.isArray(load.payments)?load.payments:[];let changed=false;
    load.payments=load.payments.map((payment,index)=>{
      const invoiceNumber=payment?.allocation?.invoiceNumber||payment?.invoiceNumber||load.invoice?.number||'';
      const normalized={...payment,id:String(payment.id||makeId(payment.type==='Reversal'?'REV':'PAY',load,index)),type:payment.type||'Payment',date:payment.date||new Date().toISOString().slice(0,10),method:payment.method||'Unspecified',reference:String(payment.reference||''),amount:amount(payment.amount),allocation:{invoiceNumber,amount:amount(payment.allocation?.amount??payment.amount)},createdAt:payment.createdAt||new Date().toISOString()};
      if(JSON.stringify(normalized)!==JSON.stringify(payment))changed=true;return normalized;
    });
    return changed;
  }

  function summary(load){
    const invoiceNumber=load?.invoice?.number||'',invoice=cents(load?.invoice?.total??load?.revenue),records=Array.isArray(load?.payments)?load.payments:[],adjustments=(load?.financialAdjustments||[]).filter(item=>!item.invoiceNumber||item.invoiceNumber===invoiceNumber).reduce((sum,item)=>sum+cents(item.amount),0);
    const allocated=records.filter(record=>record?.allocation?.invoiceNumber===invoiceNumber),paid=allocated.reduce((sum,record)=>sum+cents(record.amount),0),receivable=invoice+adjustments-paid;
    const allocationsMatch=records.every(record=>record?.allocation?.invoiceNumber===invoiceNumber&&cents(record.allocation?.amount)===cents(record.amount));
    const chargeTotal=invoice+adjustments,status=!load?.invoice?.finalizedAt&&load?.invoice?.status!=='Finalized'?'NOT FINALIZED':paid===0?'OPEN':paid<chargeTotal?'PARTIALLY PAID':paid===chargeTotal?'PAID':'OVERPAID';
    return {invoiceNumber,invoice,adjustments,payments:paid,receivable,status,allocationsMatch,records};
  }

  function recordPayment(load,input,options={}){
    if(!load?.invoice?.number||(load.invoice.status!=='Finalized'&&!load.invoice.finalizedAt))return {ok:false,reason:'Finalize the invoice before recording payment.'};
    normalizePayments(load);const value=amount(input?.amount);
    if(!(value>0))return {ok:false,reason:'Payment amount must be greater than zero.'};
    const date=String(input.date||'').trim(),method=String(input.method||'').trim(),reference=String(input.reference||'').trim();
    if(!date||!method)return {ok:false,reason:'Payment date and method are required.'};
    const duplicate=load.payments.some(item=>item.type!=='Reversal'&&cents(item.amount)===cents(value)&&item.date===date&&item.method===method&&item.reference===reference&&item.allocation?.invoiceNumber===load.invoice.number);
    if(duplicate){const ask=options.confirmDuplicate||globalThis.confirm;if(typeof ask!=='function'||!ask('A matching payment already exists. Record another?'))return {ok:false,reason:'Duplicate payment cancelled.'};}
    const payment={id:String(options.id||makeId('PAY',load,load.payments.length)),type:'Payment',date,method,reference,amount:value,allocation:{invoiceNumber:load.invoice.number,amount:value},createdAt:(options.now||new Date()).toISOString()};
    load.payments.push(payment);return {ok:true,payment,summary:summary(load)};
  }

  function reversePayment(load,paymentId,reason,options={}){
    normalizePayments(load);const original=load?.payments?.find(item=>item.id===paymentId);
    if(!original||original.type==='Reversal')return {ok:false,reason:'The original payment was not found.'};
    if(load.payments.some(item=>item.type==='Reversal'&&item.reversesPaymentId===paymentId))return {ok:false,reason:'This payment has already been reversed.'};
    const note=String(reason||'').trim();if(!note)return {ok:false,reason:'A reversal reason is required.'};
    const ask=options.confirm||globalThis.confirm;if(typeof ask!=='function'||!ask('Reverse payment '+paymentId+'? The original record will remain in the audit history.'))return {ok:false,reason:'Reversal cancelled.'};
    const value=-Math.abs(amount(original.amount)),reversal={id:String(options.id||makeId('REV',load,load.payments.length)),type:'Reversal',date:String(options.date||new Date().toISOString().slice(0,10)),method:original.method,reference:original.reference,amount:value,allocation:{invoiceNumber:original.allocation.invoiceNumber,amount:value},reversesPaymentId:original.id,reason:note,createdAt:(options.now||new Date()).toISOString()};
    load.payments.push(reversal);return {ok:true,reversal,summary:summary(load)};
  }

  function openPaymentForm(load){
    const state=summary(load);if(state.status==='NOT FINALIZED'){if(typeof toast==='function')toast('Finalize the itemized invoice before recording payment.');return}
    if(typeof modalForm!=='function'){if(typeof toast==='function')toast('Payment form is unavailable.');return}
    const due=Math.max(.01,state.receivable/100);
    modalForm('v37-payment','Record invoice payment','<div class="notice"><strong>'+esc(state.invoiceNumber)+'</strong><br>Current receivable: '+currency(state.receivable/100)+'</div><div class="field"><label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required value="'+due.toFixed(2)+'"></div><div class="field"><label>Date</label><input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="field"><label>Method</label><select name="method"><option>ACH</option><option>Check</option><option>Card</option><option>Cash</option><option>Other</option></select></div><div class="field"><label>Reference / confirmation</label><input name="reference" placeholder="Check number or transaction reference"></div>',data=>{
      const result=recordPayment(load,{amount:data.get('amount'),date:data.get('date'),method:data.get('method'),reference:data.get('reference')});if(!result.ok){if(typeof toast==='function')toast(result.reason);return}if(typeof persist==='function')persist();if(typeof renderFinance==='function')renderFinance();if(typeof toast==='function')toast('Payment '+result.payment.id+' recorded.');
    });
  }

  function render(){
    if(typeof current!=='function')return;const load=current(),migrated=normalizePayments(load);if(migrated&&typeof persist==='function')persist();const state=summary(load);
    let panel=document.getElementById('v37-payments-receivables');if(!panel){panel=document.createElement('div');panel.id='v37-payments-receivables';panel.className='panel';const close=document.getElementById('v37-financial-close');close?.parentElement?.insertBefore(panel,close)||document.querySelector('#finance')?.appendChild(panel)}if(!panel)return;
    const rows=state.records.length?state.records.map(record=>'<tr><td>'+esc(record.date)+'</td><td><strong>'+esc(record.id)+'</strong><br><span class="subtle">'+esc(record.method)+(record.reference?' · '+esc(record.reference):'')+'</span></td><td>'+esc(record.type)+(record.reversesPaymentId?'<br><span class="subtle">Reverses '+esc(record.reversesPaymentId)+'</span>':'')+'</td><td style="text-align:right"><strong>'+currency(record.amount)+'</strong></td><td style="text-align:right">'+(record.type==='Payment'&&!state.records.some(item=>item.reversesPaymentId===record.id)?'<button class="btn danger" data-v37-reverse="'+esc(record.id)+'">Reverse</button>':'')+'</td></tr>').join(''):'<tr><td colspan="5" class="subtle">No payments recorded for this invoice.</td></tr>';
    panel.innerHTML='<div class="section-head"><div><div class="eyebrow">V3.7 payments & receivables</div><h2>'+esc(state.status.replaceAll(' ',' '))+'</h2><p class="subtle" style="margin-top:5px">Every payment and reversal remains allocated to '+esc(state.invoiceNumber||'the finalized invoice')+'.</p></div><button class="btn primary" id="v37-record-payment">Record payment</button></div><div class="grid stats"><div class="stat"><span class="label">Invoice</span><div class="value">'+currency(state.invoice/100)+'</div></div><div class="stat"><span class="label">Net payments</span><div class="value">'+currency(state.payments/100)+'</div></div><div class="stat"><span class="label">Receivable</span><div class="value">'+currency(state.receivable/100)+'</div></div></div><table><thead><tr><th>Date</th><th>Payment ID</th><th>Type</th><th style="text-align:right">Amount</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
    document.getElementById('v37-record-payment')?.addEventListener('click',()=>openPaymentForm(load));
    panel.querySelectorAll?.('[data-v37-reverse]').forEach(button=>button.addEventListener('click',()=>{const reason=globalThis.prompt?.('Reason for reversing this payment:','Entered incorrectly');if(reason===null)return;const result=reversePayment(load,button.dataset.v37Reverse,reason);if(!result.ok){if(typeof toast==='function')toast(result.reason);return}if(typeof persist==='function')persist();if(typeof renderFinance==='function')renderFinance();if(typeof toast==='function')toast('Payment reversal posted.');}));
    const legacyButton=document.getElementById('record-payment');if(legacyButton){const replacement=legacyButton.cloneNode(true);replacement.textContent='Record payment';legacyButton.replaceWith(replacement);replacement.addEventListener('click',()=>openPaymentForm(load));}
    const statusTag=document.querySelector('#finance .stat:nth-child(4) .tag'),statusValue=document.querySelector('#finance .stat:nth-child(4) .value'),heading=document.querySelector('#finance .grid.three .panel:first-child h2');
    if(statusTag){statusTag.textContent=state.status;statusTag.className='tag '+(['OPEN','PARTIALLY PAID','NOT FINALIZED'].includes(state.status)?'orange':'')}if(statusValue)statusValue.textContent=currency(state.receivable/100);if(heading)heading.textContent=state.status==='PAID'?'Paid in full':state.status==='OVERPAID'?'Overpayment recorded':state.status==='NOT FINALIZED'?'Invoice not finalized':'Awaiting remittance';
  }

  window.FLTPaymentsReceivables={normalizePayments,summary,recordPayment,reversePayment,render};
  if(typeof renderFinance==='function'){const prior=renderFinance;renderFinance=()=>{prior();render();};}
  render();
})();
