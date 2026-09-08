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
    #v38-core-load-decision-fields{margin:14px 0;}
    #v38-core-load-decision-fields .v38-core-grid{
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px;
    }
    #v38-core-load-decision-fields .v38-core-grid>.field{margin:0!important;min-width:0}
    #v38-core-load-decision-fields .v38-core-grid label{font-weight:800}
    @media(max-width:760px){#v38-core-load-decision-fields .v38-core-grid{grid-template-columns:1fr}}
  `;
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