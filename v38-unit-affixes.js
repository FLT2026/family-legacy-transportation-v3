(() => {
  if(typeof document==='undefined')return;

  const moneyName=/\b(rate|price|cost|pay|charge|charges|profit|revenue|amount|toll|tolls|permit|permits|reserve|reserves|walk-away|target|ask|invoice|payment|expense|expenses|balance|subtotal|total|tax|fee|fees|parking|lodging|meals|scales|washout|loading|unloading|securement|insurance|accessorial|accessorials)\b/i;
  const excludeMoney=/\b(mpg|rpm|cpm|percent|percentage|%|weight|lb|gvwr|gcwr|gawr|payload|mile|miles|mileage)\b/i;
  const weightName=/\b(weight|payload|gvwr|gcwr|gawr)\b/i;
  const criticalEditableIds=new Set(['v35-offer','v35-loaded-miles','v35-cargo-weight','v35-deadhead-miles']);

  const labelFor=input=>{
    const field=input.closest('.field');
    const label=field&&field.querySelector('label');
    return `${label?label.textContent:''} ${input.getAttribute('aria-label')||''} ${input.name||''} ${input.id||''}`.trim();
  };

  const hardenEditable=input=>{
    if(!input)return;
    if(criticalEditableIds.has(input.id)){
      input.disabled=false;
      input.readOnly=false;
      input.removeAttribute('readonly');
      input.removeAttribute('disabled');
      input.setAttribute('aria-readonly','false');
      input.tabIndex=0;
    }
    input.style.pointerEvents='auto';
    input.style.userSelect='text';
    input.style.webkitUserSelect='text';
    input.style.position='relative';
    input.style.zIndex='2';
  };

  const decorate=(input,kind)=>{
    if(!input)return;
    hardenEditable(input);
    if(input.dataset.fltUnitAffix)return;
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
    wrap.addEventListener('pointerdown',event=>{
      if(event.target===wrap||event.target===unit){
        event.preventDefault();
        input.focus({preventScroll:true});
        try{input.setSelectionRange(String(input.value||'').length,String(input.value||'').length)}catch(error){}
      }
    });
  };

  const classify=input=>{
    const name=labelFor(input);
    if(weightName.test(name))return'weight';
    if(moneyName.test(name)&&!excludeMoney.test(name))return'money';
    return'';
  };

  const scan=()=>{
    document.querySelectorAll('input[type="number"],input[inputmode="decimal"],input[inputmode="numeric"]').forEach(input=>{
      hardenEditable(input);
      const kind=classify(input);
      if(kind)decorate(input,kind);
    });
    criticalEditableIds.forEach(id=>hardenEditable(document.getElementById(id)));
  };

  const style=document.createElement('style');
  style.id='v38-unit-affixes-style';
  style.textContent=`
    .flt-unit-input{position:relative;display:flex;align-items:center;width:100%;min-width:0;border:1px solid #cfd8ce;border-radius:5px;background:#fff;overflow:hidden;cursor:text}
    .flt-unit-input:focus-within{border-color:var(--green-2);box-shadow:0 0 0 3px rgba(45,123,98,.12)}
    .flt-unit-input>input{border:0!important;box-shadow:none!important;border-radius:0!important;min-width:0!important;width:100%!important;background:transparent!important;pointer-events:auto!important;position:relative!important;z-index:2!important;padding-left:10px!important;padding-right:10px!important}
    .flt-unit-affix{flex:none;font-weight:800;color:#45534c;pointer-events:none!important;user-select:none;z-index:1}
    .flt-unit-money>.flt-unit-affix{padding-left:11px}
    .flt-unit-weight>.flt-unit-affix{padding-right:11px}
    #v38-core-load-decision-fields .flt-unit-input{min-width:126px}
    #v38-core-load-decision-fields #v35-offer{min-width:86px!important}
    @media(max-width:760px){#v38-core-load-decision-fields .flt-unit-input{min-width:0}}
  `;
  document.head.appendChild(style);

  scan();
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly']});
  window.addEventListener('flt:proposed-load-layout-ready',scan);
  window.addEventListener('flt:modules-loaded',scan);
  window.dispatchEvent(new CustomEvent('flt:unit-affixes-ready'));
})();