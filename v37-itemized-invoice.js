(() => {
  const cents=value=>Math.round((Number(value)||0)*100);
  const amount=value=>cents(value)/100;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const currency=value=>typeof money==='function'?money(Number(value)||0):'$'+(Number(value)||0).toFixed(2);
  const today=()=>new Date().toISOString().slice(0,10);
  const addDays=(date,days)=>{const value=new Date((date||today())+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)};
  const termsDays=terms=>{const match=String(terms||'').match(/net\s+(\d+)/i);return match?Number(match[1]):0};
  const statusOf=item=>String(item?.status||'').trim().toLowerCase();

  function approvedAccessorials(load){
    const source=[...(Array.isArray(load?.accessorials)?load.accessorials:[]),...(Array.isArray(load?.accessorialEvents)?load.accessorialEvents:[])];
    return source.filter(item=>['approved','invoiced','collected'].includes(statusOf(item))&&cents(item.amount)!==0).map((item,index)=>({
      id:String(item.id||item.accessorialId||'ACC-'+(index+1)),
      type:'accessorial',
      description:String(item.description||item.category||item.type||'Approved accessorial'),
      amount:amount(item.amount),
      sourceId:String(item.id||item.accessorialId||''),
      approvalStatus:String(item.status)
    }));
  }

  function approvedAdjustments(load){
    const source=[...(Array.isArray(load?.invoiceAdjustments)?load.invoiceAdjustments:[]),...(Array.isArray(load?.credits)?load.credits:[])];
    return source.filter(item=>['approved','posted','invoiced'].includes(statusOf(item))&&cents(item.amount)!==0).map((item,index)=>{
      const raw=amount(item.amount),isCredit=String(item.type||'').toLowerCase()==='credit'||raw<0;
      return {id:String(item.id||'ADJ-'+(index+1)),type:isCredit?'credit':'adjustment',description:String(item.description||item.reason||(isCredit?'Approved credit':'Approved adjustment')),amount:isCredit?-Math.abs(raw):raw,sourceId:String(item.id||'')};
    });
  }

  function draft(load,now=today()){
    const terms=String(load?.paymentTerms||load?.terms||'Net 30');
    const lines=[{id:'BASE-'+String(load?.id||'LOAD'),type:'transportation',description:'Transportation service · '+String(load?.pickup||'Pickup')+' to '+String(load?.delivery||'Delivery'),amount:amount(load?.revenue)},...approvedAccessorials(load),...approvedAdjustments(load)];
    const total=lines.reduce((sum,line)=>sum+cents(line.amount),0)/100;
    return {
      number:load?.invoice?.number||'',version:'V3.7',loadId:String(load?.id||''),status:'Draft',created:load?.invoice?.created||new Date().toISOString(),
      billToSnapshot:{customer:String(load?.customer||''),address:{...(load?.billingAddress||load?.customerAddress||{})}},
      termsSnapshot:terms,invoiceDate:now,dueDate:addDays(now,termsDays(terms)),lineItems:lines,subtotal:total,total
    };
  }

  function nextNumber(loads){
    const highest=(loads||[]).reduce((max,item)=>{const match=String(item?.invoice?.number||'').match(/^INV-(\d+)$/);return match?Math.max(max,Number(match[1])):max},0);
    return 'INV-'+String(highest+1).padStart(6,'0');
  }

  function prepare(load,loads,now=today()){
    if(!load)return null;
    if(load.invoice?.status==='Finalized'||load.invoice?.finalizedAt)return load.invoice;
    const invoice=draft(load,now);invoice.number=load.invoice?.number||nextNumber(loads);load.invoice=invoice;return invoice;
  }

  function finalize(load,options={}){
    if(!load?.invoice||load.invoice.status!=='Draft')return {ok:false,reason:'Prepare the invoice draft first.'};
    if(!(load.pod&&load.deliveryProof?.signature))return {ok:false,reason:'Signed POD is required before finalization.'};
    if(cents(load.invoice.total)!==load.invoice.lineItems.reduce((sum,line)=>sum+cents(line.amount),0))return {ok:false,reason:'Invoice lines do not equal the invoice total.'};
    const ask=options.confirm||globalThis.confirm;
    if(typeof ask!=='function'||!ask('Finalize '+load.invoice.number+'? Its customer, terms, due date, and line items will be locked.'))return {ok:false,reason:'Finalization cancelled.'};
    load.invoice={...load.invoice,status:'Finalized',finalizedAt:(options.now||new Date()).toISOString(),lineItems:load.invoice.lineItems.map(line=>({...line})),billToSnapshot:{...load.invoice.billToSnapshot,address:{...(load.invoice.billToSnapshot?.address||{})}}};
    return {ok:true,invoice:load.invoice};
  }

  function printInvoice(load){
    const invoice=load?.invoice;if(!invoice?.lineItems?.length){if(typeof toast==='function')toast('Prepare the V3.7 invoice draft first.');return false}
    const paymentState=window.FLTPaymentsReceivables?.summary(load),paid=paymentState?paymentState.payments/100:(load.payments||[]).reduce((sum,item)=>sum+Number(item.amount||0),0),balance=paymentState?paymentState.receivable/100:Number(invoice.total)-paid,win=window.open('','_blank');
    if(!win){if(typeof toast==='function')toast('Allow pop-ups to print the invoice.');return false}
    const address=Object.values(invoice.billToSnapshot?.address||{}).filter(Boolean).join(', '),typeName=line=>line.type==='accessorial'?'Accessorial':line.type==='credit'?'Credit':line.type==='adjustment'?'Adjustment':'Transportation',rows=invoice.lineItems.map(line=>'<tr><td>'+esc(line.description)+'</td><td>'+esc(typeName(line))+'</td><td style="text-align:right">'+currency(line.amount)+'</td></tr>').join('');
    win.document.write('<!doctype html><title>'+esc(invoice.number)+' | Family Legacy Transportation</title><style>@page{margin:12mm}body{font:13px/1.4 Arial;color:#17221f;max-width:760px;margin:28px auto}header{display:flex;justify-content:space-between;border-bottom:3px solid #1e5a4d;padding-bottom:12px}h1{color:#1e5a4d;margin:0;font-size:22px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}.summary{margin-left:auto;width:48%}.total{font-size:18px;color:#1e5a4d}</style><header><div><h1>Family Legacy Transportation, LLC</h1><div>Itemized transportation invoice</div></div><div><strong>INVOICE '+esc(invoice.number)+'</strong><br>'+esc(invoice.invoiceDate)+'<br>Due '+esc(invoice.dueDate)+'</div></header><p><strong>Bill to:</strong><br>'+esc(invoice.billToSnapshot?.customer||'Customer on file')+'<br>'+esc(address||'Address on file')+'</p><p><strong>Load ID:</strong> '+esc(invoice.loadId)+'<br><strong>Terms:</strong> '+esc(invoice.termsSnapshot)+'<br><strong>Status:</strong> '+esc(invoice.status)+'</p><table><thead><tr><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>'+rows+'</tbody></table><table class="summary"><tr><td>Total</td><td style="text-align:right">'+currency(invoice.total)+'</td></tr><tr><td>Payments</td><td style="text-align:right">'+currency(paid)+'</td></tr><tr class="total"><td><strong>Amount due</strong></td><td style="text-align:right"><strong>'+currency(balance)+'</strong></td></tr></table>');
    win.document.close();win.focus();win.print();return true;
  }

  function render(){
    if(typeof current!=='function')return;
    const load=current();let panel=document.getElementById('v37-itemized-invoice');
    if(!panel){panel=document.createElement('div');panel.id='v37-itemized-invoice';panel.className='panel';const close=document.getElementById('v37-financial-close');close?.parentElement?.insertBefore(panel,close)||document.querySelector('#finance')?.appendChild(panel)}
    if(!panel)return;
    const invoice=load?.invoice?.version==='V3.7'?load.invoice:null,locked=Boolean(invoice&&(invoice.status==='Finalized'||invoice.finalizedAt));
    const lineType=line=>line.type==='accessorial'?'Accessorial':line.type==='credit'?'Credit':line.type==='adjustment'?'Adjustment':'Transportation';
    const rows=invoice?.lineItems?.length?invoice.lineItems.map(line=>'<tr><td>'+esc(line.description)+'</td><td>'+esc(lineType(line))+'</td><td style="text-align:right"><strong>'+currency(line.amount)+'</strong></td></tr>').join(''):'<tr><td colspan="3" class="subtle">Prepare a draft to itemize this load.</td></tr>';
    panel.innerHTML='<div class="section-head"><div><div class="eyebrow">V3.7 itemized invoice</div><h2>Invoice lifecycle</h2><p class="subtle" style="margin-top:5px">Load '+esc(load?.id||'not selected')+' · customer, terms, and charges stay with this invoice.</p></div><span class="tag '+(locked?'':'orange')+'">'+(locked?'FINALIZED':invoice?'DRAFT':'NOT PREPARED')+'</span></div><table><thead><tr><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>'+rows+'</tbody></table>'+(invoice?'<div class="metric-row"><span>Terms · '+esc(invoice.termsSnapshot)+' · due '+esc(invoice.dueDate)+'</span><strong>'+currency(invoice.total)+'</strong></div>':'')+'<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">'+(!locked?'<button class="btn" id="v37-prepare-invoice">'+(invoice?'Refresh draft':'Prepare invoice draft')+'</button>':'')+(invoice&&!locked?'<button class="btn primary" id="v37-finalize-invoice">Finalize invoice</button>':'')+'</div>';
    document.getElementById('v37-prepare-invoice')?.addEventListener('click',()=>{prepare(load,store?.loads||[]);if(typeof persist==='function')persist();if(typeof toast==='function')toast('Invoice draft prepared from this load.');render()});
    document.getElementById('v37-finalize-invoice')?.addEventListener('click',()=>{const result=finalize(load);if(!result.ok){if(typeof toast==='function')toast(result.reason);return}if(typeof persist==='function')persist();if(typeof toast==='function')toast('Invoice finalized and locked.');if(typeof renderFinance==='function')renderFinance();else render()});
    const oldPrint=document.getElementById('generate-invoice-top');
    if(oldPrint){const replacement=oldPrint.cloneNode(true);replacement.dataset.v37Print='true';replacement.textContent=invoice?'View / Print itemized invoice':'Prepare itemized invoice';oldPrint.replaceWith(replacement);replacement.addEventListener('click',()=>{if(!load.invoice?.lineItems){prepare(load,store?.loads||[]);if(typeof persist==='function')persist();render();return}printInvoice(load)});}
  }

  window.FLTItemizedInvoice={approvedAccessorials,approvedAdjustments,draft,prepare,finalize,printInvoice,render};
  if(typeof renderFinance==='function'){const prior=renderFinance;renderFinance=()=>{prior();render();};}
  render();
})();
