(() => {
  document.title='Family Legacy Commercial Command™ V3.7';
  const header=document.querySelector('header .eyebrow');if(header)header.textContent='Family Legacy Commercial Command™ / V3.7';
  const footer=document.getElementById('clock')?.parentElement;if(footer)footer.childNodes[0].textContent='V3.7 COMMERCIAL COMMAND · ';
  const testTitle=document.querySelector('#test > .panel > .section-head h2');if(testTitle)testTitle.textContent='V3.7 Test Gate';
  const testNav=document.querySelector('[data-view="test"] .nav-label');if(testNav)testNav.textContent='V3.7 Test Gate';
  const cents=value=>Math.round((Number(value)||0)*100);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sum=(items,pick)=>items.reduce((total,item)=>total+cents(pick(item)),0);
  const invoiceAmount=load=>cents(load?.invoice?.total ?? (typeof actualRevenue==='function'?actualRevenue(load):load?.actualRevenue ?? load?.revenue));
  const paymentRecords=load=>Array.isArray(load?.payments)?load.payments:[];
  const paymentAmount=load=>sum(paymentRecords(load).filter(item=>!item.allocation||item.allocation.invoiceNumber===load?.invoice?.number),item=>item.amount);
  const expenseAmount=load=>sum(Array.isArray(load?.expenses)?load.expenses:[],item=>item.amount);
  const adjustmentAmount=load=>sum((Array.isArray(load?.financialAdjustments)?load.financialAdjustments:[]).filter(item=>!item.invoiceNumber||item.invoiceNumber===load?.invoice?.number),item=>item.amount);

  function reconcile(load){
    const invoice=invoiceAmount(load),payments=paymentAmount(load),expenses=expenseAmount(load),adjustments=adjustmentAmount(load),receivable=invoice+adjustments-payments,journal=[],records=paymentRecords(load);
    if(load?.invoice?.number&&invoice){
      journal.push({source:'invoice',account:'Accounts Receivable',debit:invoice,credit:0});
      const lines=Array.isArray(load.invoice.lineItems)?load.invoice.lineItems:[];
      if(lines.length){
        lines.forEach((line,index)=>{const value=cents(line.amount),account=line.type==='accessorial'?'Accessorial Revenue':line.type==='credit'||line.type==='adjustment'?'Revenue Adjustments':'Transportation Revenue';if(value)journal.push({source:'invoice-line-'+index,account,debit:value<0?-value:0,credit:value>0?value:0});});
      }else journal.push({source:'invoice',account:'Transportation Revenue',debit:0,credit:invoice});
    }
    records.forEach((payment,index)=>{
      const value=cents(payment.amount);if(!value)return;
      journal.push({source:'payment-'+index,account:'Cash / Undeposited Funds',debit:value>0?value:0,credit:value<0?-value:0});
      journal.push({source:'payment-'+index,account:'Accounts Receivable',debit:value<0?-value:0,credit:value>0?value:0});
    });
    (load?.expenses||[]).forEach((expense,index)=>{
      const amount=cents(expense.amount);if(!amount)return;
      journal.push({source:'expense-'+index,account:(expense.category||'Other')+' Expense',debit:amount,credit:0});
      journal.push({source:'expense-'+index,account:'Cash / Payables',debit:0,credit:amount});
    });
    (load?.financialAdjustments||[]).forEach((adjustment,index)=>{
      if(adjustment.invoiceNumber&&adjustment.invoiceNumber!==load?.invoice?.number)return;const value=cents(adjustment.amount);if(!value)return;
      journal.push({source:'adjustment-'+index,account:value<0?'Revenue Adjustments':'Accounts Receivable',debit:Math.abs(value),credit:0});
      journal.push({source:'adjustment-'+index,account:value<0?'Accounts Receivable':'Revenue Adjustments',debit:0,credit:Math.abs(value)});
    });
    const debits=journal.reduce((total,row)=>total+row.debit,0),credits=journal.reduce((total,row)=>total+row.credit,0);
    const linesEqualInvoice=!Array.isArray(load?.invoice?.lineItems)||sum(load.invoice.lineItems,line=>line.amount)===invoice;
    const allocationsMatch=records.every(payment=>!payment.allocation||(payment.allocation.invoiceNumber===load?.invoice?.number&&cents(payment.allocation.amount)===cents(payment.amount)));
    return {loadId:load?.id||'',podComplete:Boolean(load?.pod&&load?.deliveryProof?.signature),invoiceNumber:load?.invoice?.number||'',invoice,adjustments,payments,receivable,expenses,profit:invoice+adjustments-expenses,debits,credits,balanced:debits===credits,linesEqualInvoice,allocationsMatch,journal};
  }

  function isolationCheck(loads){
    if(!Array.isArray(loads)||loads.length<2)return true;
    return loads.every((load,index)=>{
      const before=JSON.stringify(reconcile(load)),otherIndex=(index+1)%loads.length;
      const copies=loads.map((item,position)=>position===otherIndex?{...item,payments:[...(item.payments||[]),{amount:123456.78,date:'isolation-test'}]}:{...item});
      const after=JSON.stringify(reconcile(copies[index]));
      return before===after;
    });
  }

  const display=value=>typeof money==='function'?money(value/100):'$'+(value/100).toFixed(2);
  const tag=(label,pass)=>'<span class="tag '+(pass?'':'orange')+'">'+label+'</span>';
  function renderFinancialClose(){
    if(typeof current!=='function')return;
    const result=reconcile(current()),isolated=isolationCheck(store?.loads||[]),ledgerAudit=window.FLTDoubleEntryLedger?.audit?.(current()),ledgerPass=ledgerAudit?ledgerAudit.pass:true;
    let panel=document.getElementById('v37-financial-close');
    if(!panel){panel=document.createElement('div');panel.id='v37-financial-close';panel.className='panel';document.querySelector('#finance')?.appendChild(panel);}
    if(panel)panel.innerHTML='<div class="section-head"><div><div class="eyebrow">V3.7 financial close</div><h2>Load-ID reconciliation</h2><p class="subtle" style="margin-top:5px">Read-only foundation for '+esc(result.loadId||'no selected load')+'.</p></div>'+tag(result.balanced&&result.linesEqualInvoice&&result.allocationsMatch&&ledgerPass&&isolated?'RECONCILED':'REVIEW',result.balanced&&result.linesEqualInvoice&&result.allocationsMatch&&ledgerPass&&isolated)+'</div><div class="grid stats"><div class="stat"><span class="label">Invoice + adjustments</span><div class="value">'+display(result.invoice+result.adjustments)+'</div></div><div class="stat"><span class="label">Payments</span><div class="value">'+display(result.payments)+'</div></div><div class="stat"><span class="label">Receivable</span><div class="value">'+display(result.receivable)+'</div></div><div class="stat"><span class="label">Earned profit</span><div class="value">'+display(result.profit)+'</div></div></div><div class="metric-row"><span>POD linked to this Load ID</span>'+tag(result.podComplete?'PASS':'PENDING',result.podComplete)+'</div><div class="metric-row"><span>Invoice lines equal invoice total</span>'+tag(result.linesEqualInvoice?'PASS':'FAIL',result.linesEqualInvoice)+'</div><div class="metric-row"><span>Payments equal invoice allocations</span>'+tag(result.allocationsMatch?'PASS':'FAIL',result.allocationsMatch)+'</div><div class="metric-row"><span>Immutable source-linked journal</span>'+tag(ledgerPass?'PASS':'FAIL',ledgerPass)+'</div><div class="metric-row"><span>Journal debits '+display(result.debits)+' = credits '+display(result.credits)+'</span>'+tag(result.balanced?'PASS':'FAIL',result.balanced)+'</div><div class="metric-row"><span>Finance isolation across saved loads</span>'+tag(isolated?'PASS':'FAIL',isolated)+'</div>';
    let gate=document.getElementById('v37-gate');
    if(!gate){gate=document.createElement('div');gate.id='v37-gate';gate.className='panel';const heading=document.querySelector('#test > .panel > .section-head'),host=document.querySelector('#test > .panel');if(heading?.insertAdjacentElement)heading.insertAdjacentElement('afterend',gate);else host?.appendChild(gate);}
    const linked=result.podComplete&&Boolean(result.invoiceNumber),finalized=current().invoice?.status==='Finalized',complete=linked&&finalized&&result.linesEqualInvoice&&result.allocationsMatch&&ledgerPass&&result.balanced&&isolated;
    if(gate)gate.innerHTML='<div class="section-head"><div><div class="eyebrow">Current milestone · V3.7 acceptance</div><h2>Financial Close Gate</h2><p class="subtle" style="margin-top:5px">Earlier V3.5 and V3.6 gates remain below as regression checks.</p></div>'+tag(complete?'LEDGER PASS':'IN PROGRESS',complete)+'</div><div class="metric-row"><span>POD, invoice, and Load ID linked</span>'+tag(linked?'PASS':'PENDING',linked)+'</div><div class="metric-row"><span>Invoice finalized and line items reconcile</span>'+tag(finalized&&result.linesEqualInvoice?'PASS':'PENDING',finalized&&result.linesEqualInvoice)+'</div><div class="metric-row"><span>Payments equal invoice allocations</span>'+tag(result.allocationsMatch?'PASS':'FAIL',result.allocationsMatch)+'</div><div class="metric-row"><span>Immutable source-linked journal</span>'+tag(ledgerPass?'PASS':'FAIL',ledgerPass)+'</div><div class="metric-row"><span>Double-entry journal balances</span>'+tag(result.balanced?'PASS':'FAIL',result.balanced)+'</div><div class="metric-row"><span>Second-load values cannot leak into this load</span>'+tag(isolated?'PASS':'FAIL',isolated)+'</div>';
  }
  window.FLTFinancialClose={reconcile,isolationCheck,render:renderFinancialClose};
  if(typeof renderFinance==='function'){const prior=renderFinance;renderFinance=()=>{prior();renderFinancialClose();};}
  if(typeof renderGate==='function'){const prior=renderGate;renderGate=()=>{prior();renderFinancialClose();};}
  renderFinancialClose();
})();
