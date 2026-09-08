(() => {
  if(typeof document==='undefined')return;

  const moneyName=/\b(rate|price|cost|pay|charge|profit|revenue|amount|toll|permit|reserve|walk-away|target|ask|invoice|payment|expense|balance|subtotal|total|tax|fee)\b/i;
  const excludeMoney=/\b(mile|miles|mpg|rpm|cpm|percent|percentage|%|weight|lb|gvwr|gcwr|gawr|payload)\b/i;
  const weightName=/\b(weight|payload|gvwr|gcwr|gawr)\b/i;

  const labelFor=input=>{
    const field=input.closest('.field');
    const label=field&&field.querySelector('label');
    return `${label?label.textContent:''} ${input.getAttribute('aria-label')||''} ${input.name||''} ${input.id||''}`.trim();
  };

  const decorate=(input,kind)=>{
    if(!input||input.dataset.fltUnitAffix)return;
    const parent=input.parentElement;
    if(!parent)return;
    const wrap=document.createElement('div');
    wrap.className=`flt-unit-input flt-unit-${kind}`;
    parent.insertBefore(wrap,input);
    wrap.appendChild(input);
    const unit=document.createElement('span');
    unit.className='flt-unit-affix';
    unit.textContent=kind==='money'?'$':'lb';
    unit.setAttribute('aria-hidden','true');
    if(kind==='money')wrap.insertBefore(unit,input); else wrap.appendChild(unit);
    input.dataset.fltUnitAffix=kind;
  };

  const scan=()=>{
    document.querySelectorAll('input[type="number"],input[inputmode="decimal"],input[inputmode="numeric"]').forEach(input=>{
      if(input.dataset.fltUnitAffix)return;
      const name=labelFor(input);
      if(weightName.test(name))decorate(input,'weight');
      else if(moneyName.test(name)&&!excludeMoney.test(name))decorate(input,'money');
    });
  };

  const style=document.createElement('style');
  style.id='v38-unit-affixes-style';
  style.textContent=`
    .flt-unit-input{position:relative;display:flex;align-items:center;width:100%;min-width:0;border:1px solid #cfd8ce;border-radius:5px;background:#fff;overflow:hidden}
    .flt-unit-input:focus-within{border-color:var(--green-2);box-shadow:0 0 0 3px rgba(45,123,98,.12)}
    .flt-unit-input>input{border:0!important;box-shadow:none!important;border-radius:0!important;min-width:0;width:100%;background:transparent!important}
    .flt-unit-affix{flex:none;font-weight:800;color:#45534c;pointer-events:none;user-select:none}
    .flt-unit-money>.flt-unit-affix{padding-left:11px}
    .flt-unit-weight>.flt-unit-affix{padding-right:11px}
    #v35-offer{min-width:0}
  `;
  document.head.appendChild(style);

  scan();
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('flt:proposed-load-layout-ready',scan);
  window.dispatchEvent(new CustomEvent('flt:unit-affixes-ready'));
})();