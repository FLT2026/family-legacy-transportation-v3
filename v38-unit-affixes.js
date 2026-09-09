(() => {
  if(typeof document==='undefined')return;

  const moneyName=/\b(rate|price|cost|pay|charge|charges|profit|revenue|amount|toll|tolls|permit|permits|reserve|reserves|walk-away|target|ask|invoice|payment|expense|expenses|balance|subtotal|total|tax|fee|fees|parking|lodging|meals|scales|washout|loading|unloading|securement|insurance|accessorial|accessorials)\b/i;
  const weightName=/\b(weight|payload|gvwr|gcwr|gawr)\b/i;
  const mileName=/\b(mile|miles|mileage)\b/i;
  const gallonName=/\b(gallon|gallons|gal)\b/i;
  const mpgName=/\bmpg\b|miles\s+per\s+gallon/i;
  const percentName=/\b(percent|percentage)\b|%/i;
  const criticalEditableIds=new Set(['v35-offer','v35-loaded-miles','v35-cargo-weight','v35-deadhead-miles']);

  const labelFor=input=>{
    const field=input.closest('.field');
    const label=field&&field.querySelector('label');
    return `${label?label.textContent:''} ${input.getAttribute('aria-label')||''} ${input.name||''} ${input.id||''}`
      .replace(/([a-z])([A-Z])/g,'$1 $2')
      .replace(/[-_]+/g,' ')
      .trim();
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

  const unitText={money:'$',weight:'lb',miles:'mi',gallons:'gal',mpg:'mpg',percent:'%'};

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
    unit.textContent=unitText[kind]||'';
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
    if(percentName.test(name))return'percent';
    if(mpgName.test(name))return'mpg';
    if(weightName.test(name))return'weight';
    // Monetary rate/cost fields keep the dollar sign even when their basis is
    // per mile or per gallon (for example maintenance reserve / mile and fuel price / gallon).
    if(moneyName.test(name))return'money';
    if(mileName.test(name))return'miles';
    if(gallonName.test(name))return'gallons';
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
    .flt-unit-weight>.flt-unit-affix,.flt-unit-miles>.flt-unit-affix,.flt-unit-gallons>.flt-unit-affix,.flt-unit-mpg>.flt-unit-affix,.flt-unit-percent>.flt-unit-affix{padding-right:11px}
    #fuel-total-miles::after{content:' mi';font-size:.62em;font-weight:800;letter-spacing:0;color:#45534c}
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