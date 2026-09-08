(() => {
  if(typeof document==='undefined')return;
  const form=document.getElementById('v35-decision-form');
  if(!form)return;

  const ids=['v35-offer','v35-loaded-miles','v35-cargo-weight','v35-deadhead-miles'];
  const controls=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
  if(ids.some(id=>!controls[id]))return;

  const wrapperOf=control=>control.closest('.field')||control.parentElement;
  const wrappers=Object.fromEntries(ids.map(id=>[id,wrapperOf(controls[id])]));
  if(ids.some(id=>!wrappers[id]))return;

  const style=document.createElement('style');
  style.id='v38-proposed-load-layout-hardfix-style';
  style.textContent=`
    #v35-master-selection,
    #v38-core-load-decision-fields{
      margin:14px 0!important;
      width:100%!important;
      max-width:none!important;
      min-width:520px!important;
      box-sizing:border-box!important;
      overflow:visible!important;
      grid-column:span 2!important;
    }
    #v35-master-selection .form-grid,
    #v35-master-selection .grid,
    #v35-master-selection .fields{
      width:100%!important;
      max-width:none!important;
      box-sizing:border-box!important;
    }
    #v35-master-selection select{
      min-width:0!important;
      width:100%!important;
      max-width:100%!important;
      box-sizing:border-box!important;
    }
    #v38-core-load-decision-fields .v38-core-grid{
      display:grid!important;
      grid-template-columns:minmax(220px,1fr) minmax(180px,1fr)!important;
      column-gap:24px!important;
      row-gap:18px!important;
      width:100%!important;
      min-width:0!important;
      align-items:start!important;
    }
    #v38-core-load-decision-fields .v38-core-grid>.field{
      margin:0!important;
      min-width:0!important;
      width:100%!important;
      overflow:visible!important;
    }
    #v38-core-load-decision-fields .v38-core-grid label{
      display:block!important;
      width:100%!important;
      min-width:0!important;
      min-height:46px!important;
      margin:0 0 8px!important;
      font-weight:800!important;
      line-height:1.2!important;
      white-space:normal!important;
      overflow-wrap:normal!important;
      word-break:normal!important;
      hyphens:none!important;
    }
    #v38-core-load-decision-fields .v38-core-grid input,
    #v38-core-load-decision-fields .v38-core-grid select,
    #v38-core-load-decision-fields .flt-unit-input{
      width:100%!important;
      min-width:0!important;
      max-width:100%!important;
      box-sizing:border-box!important;
    }
    #v38-core-load-decision-fields .flt-unit-input>input{
      min-width:0!important;
      width:100%!important;
    }
    @media(max-width:980px){
      #v35-master-selection,
      #v38-core-load-decision-fields{min-width:0!important;grid-column:1/-1!important}
      #v38-core-load-decision-fields .v38-core-grid{grid-template-columns:minmax(180px,1fr) minmax(160px,1fr)!important;column-gap:18px!important}
    }
    @media(max-width:700px){
      #v38-core-load-decision-fields .v38-core-grid{grid-template-columns:1fr!important;column-gap:0!important;row-gap:16px!important}
      #v38-core-load-decision-fields .v38-core-grid label{min-height:0!important}
    }
  `;
  const old=document.getElementById(style.id);
  if(old)old.remove();
  document.head.appendChild(style);

  let panel=document.getElementById('v38-core-load-decision-fields');
  if(!panel){
    panel=document.createElement('div');
    panel.id='v38-core-load-decision-fields';
    panel.className='panel';
    panel.innerHTML=`<div class="section-head"><div><div class="eyebrow">Core load economics</div><h2>Fast profitability inputs</h2><p class="subtle" style="margin-top:5px">Rate and mileage stay together so the operator can evaluate the load quickly.</p></div></div><div class="v38-core-grid"></div>`;
    const master=document.getElementById('v35-master-selection');
    if(master)master.insertAdjacentElement('afterend',panel);
    else form.insertBefore(panel,form.firstElementChild);
  }

  const grid=panel.querySelector('.v38-core-grid');
  const order=['v35-offer','v35-loaded-miles','v35-cargo-weight','v35-deadhead-miles'];
  order.forEach(id=>grid.appendChild(wrappers[id]));

  const labels={
    'v35-offer':'Offered linehaul rate',
    'v35-loaded-miles':'Loaded miles',
    'v35-cargo-weight':'Cargo/Load weight (lb)',
    'v35-deadhead-miles':'Deadhead miles'
  };
  order.forEach(id=>{const label=wrappers[id].querySelector('label');if(label)label.textContent=labels[id]});

  window.dispatchEvent(new CustomEvent('flt:proposed-load-layout-ready',{detail:{order}}));
})();