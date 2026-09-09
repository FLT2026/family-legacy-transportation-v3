(() => {
  'use strict';
  if(window.FLTTestDataReset)return;

  const isCommercialCommandKey=key=>/^flt-/i.test(String(key||''));
  const matchingKeys=storage=>{
    const keys=[];
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(isCommercialCommandKey(key))keys.push(key);
    }
    return keys;
  };

  function preview(){
    return {
      localStorage:matchingKeys(localStorage),
      sessionStorage:matchingKeys(sessionStorage)
    };
  }

  function reset(){
    const before=preview();
    before.localStorage.forEach(key=>localStorage.removeItem(key));
    before.sessionStorage.forEach(key=>sessionStorage.removeItem(key));
    sessionStorage.setItem('flt-reset-complete','1');
    return before;
  }

  function confirmReset(){
    const before=preview();
    const count=before.localStorage.length+before.sessionStorage.length;
    const first=globalThis.confirm?.(
      'Reset Commercial Command TEST DATA?\n\n'+
      'This will delete '+count+' Commercial Command browser data item'+(count===1?'':'s')+' including loads, fleet records, invoices, payments, documents, audit/test records, saved addresses, and acceptance history.\n\n'+
      'GitHub code and unrelated browser/site data will NOT be deleted.'
    );
    if(!first)return false;
    const second=globalThis.confirm?.(
      'FINAL CONFIRMATION\n\nStart a completely fresh Family Legacy Commercial Command end-to-end test?\n\nThis cannot restore the browser test records after they are cleared.'
    );
    if(!second)return false;
    reset();
    location.reload();
    return true;
  }

  function mount(){
    if(document.getElementById('v38-test-data-reset'))return;
    const business=document.getElementById('business-setup')||document.querySelector('.view#business-setup')||document.querySelector('.view[data-view="business-setup"]');
    if(!business)return;
    const panel=document.createElement('div');
    panel.id='v38-test-data-reset';
    panel.className='panel';
    panel.style.marginTop='18px';
    panel.innerHTML=`
      <div class="section-head">
        <div>
          <div class="eyebrow">Acceptance testing</div>
          <h2>Fresh End-to-End Test</h2>
          <p class="subtle" style="margin-top:5px">Clear only Family Legacy Commercial Command browser test data, then restart at Dashboard. GitHub code is untouched.</p>
        </div>
        <span class="tag orange">TEST DATA ONLY</span>
      </div>
      <div class="notice" style="margin-top:12px">
        <strong>Use this only when intentionally starting a fresh system test.</strong><br>
        Driver, truck, trailer, loads, invoices, payments, documents, saved addresses, and Commercial Command audit/test records stored in this browser will be cleared.
      </div>
      <div class="form-actions" style="margin-top:14px">
        <button class="btn danger" id="v38-reset-test-data" type="button">Reset Commercial Command Test Data</button>
      </div>`;
    business.appendChild(panel);
    document.getElementById('v38-reset-test-data')?.addEventListener('click',confirmReset);
  }

  window.FLTTestDataReset={preview,reset,confirmReset,mount,isCommercialCommandKey};
  mount();
  window.addEventListener('flt:modules-loaded',mount,{once:true});
})();
