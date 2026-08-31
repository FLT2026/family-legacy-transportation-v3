(() => {
  if(document.getElementById('v35-guided-workflow-style'))return;
  const style=document.createElement('style');
  style.id='v35-guided-workflow-style';
  style.textContent=`
    .field-error-control{border:2px solid var(--red)!important;background:#fff3f1!important;box-shadow:0 0 0 3px rgba(185,76,72,.12)!important}
    .field-error-text{display:block;color:var(--red);font-size:12px;font-weight:700;margin-top:5px}
    .validation-summary{border:1px solid #e1aaa5;border-left:5px solid var(--red);background:#fff3f1;color:#6f2926;padding:12px 14px;border-radius:7px;margin:0 0 16px}
    .validation-summary strong{display:block;margin-bottom:4px}.validation-summary button{border:0;background:transparent;color:#6f2926;text-decoration:underline;padding:2px 0;cursor:pointer;text-align:left}
    .next-action{display:flex;justify-content:space-between;gap:18px;align-items:center;border-left:5px solid var(--lime);margin:0 0 14px}
    .workflow-map{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.workflow-map span{font-size:11px;padding:5px 8px;border-radius:999px;background:#eef2eb;color:#506059}.workflow-map span.current{background:var(--lime);color:var(--ink);font-weight:800}
    #nav button.nav-required{background:#365247;color:#fff;box-shadow:inset 4px 0 var(--lime),0 0 0 1px rgba(207,232,106,.5)}
    #nav button.nav-required::after{content:'NEXT';margin-left:auto;background:var(--lime);color:var(--ink);font-size:9px;font-weight:900;letter-spacing:.08em;padding:3px 6px;border-radius:999px}
    #nav button.nav-required.active{background:#3f5e51}
    .nav-admin{margin-top:12px;border-top:1px solid rgba(255,255,255,.12)!important;padding-top:14px!important}
    @media(max-width:900px){#nav button.nav-required::after{content:'';width:7px;height:7px;padding:0;position:absolute;right:5px}}
    @media(max-width:700px){.next-action{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  const nav=document.getElementById('nav');
  const loadButton=nav?.querySelector('[data-view="load"]');
  const intelligenceButton=nav?.querySelector('[data-view="intelligence"]');
  const testButton=nav?.querySelector('[data-view="test"]');
  if(nav&&loadButton&&intelligenceButton){
    nav.insertBefore(intelligenceButton,loadButton);
    intelligenceButton.querySelector('.nav-label').textContent='Evaluate Proposed Load';
    loadButton.querySelector('.nav-label').textContent='Accept & Create Load';
  }
  if(testButton){testButton.classList.add('nav-admin');testButton.querySelector('.nav-label').textContent='Admin / V3.5 Test Gate'}

  const viewNames={business:'business-setup',fleet:'fleet',intelligence:'intelligence',load:'load',pickup:'pickup',delivery:'delivery',finance:'finance'};
  function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(error){return fallback}}
  function nextAction(){
    const profile=read('flt-v34-business-profile');
    const classification=read('flt-v35-classification');
    const fleet=read('flt-v35-fleet',{drivers:[],trucks:[],trailers:[]});
    const snapshots=read('flt-v35-estimate-snapshots',[]);
    if(!profile)return{title:'Complete Business Setup',detail:'Save the company identity and operating state once so later records can auto-fill.',view:viewNames.business,step:1};
    if(!classification)return{title:'Save Operation Classification',detail:'Choose the company role, operating area, driver class, and planned equipment.',view:viewNames.business,step:2};
    if(!fleet.drivers?.length||!fleet.trucks?.length||!fleet.trailers?.length)return{title:'Add Driver and Equipment Records',detail:'Create separate planned records for at least one driver, truck, and trailer.',view:viewNames.fleet,step:3};
    if(!snapshots.length)return{title:'Evaluate a Proposed Load',detail:'Enter the route, miles, offer, fuel, costs, and profit requirements before accepting the work.',view:viewNames.intelligence,step:4};
    return{title:'Create or Review the Load',detail:'The economics are saved. Accept the work only after reviewing the decision and reasons.',view:viewNames.load,step:5};
  }
  const dashboard=document.getElementById('dashboard');
  const hero=dashboard?.querySelector('.hero');
  if(dashboard&&hero&&!document.getElementById('v35-next-action')){
    const card=document.createElement('div');card.id='v35-next-action';card.className='panel next-action';
    hero.insertAdjacentElement('afterend',card);
  }
  function renderNext(){
    const next=nextAction(),steps=['Business','Classification','Fleet','Evaluate','Create Load','Dispatch','Pickup','Delivery','Invoice'];
    nav?.querySelectorAll('button').forEach(button=>button.classList.toggle('nav-required',button.dataset.view===next.view));
    const card=document.getElementById('v35-next-action');if(!card)return;
    card.innerHTML='<div><div class="eyebrow">Next required action</div><h2>'+next.title+'</h2><p class="subtle" style="margin-top:5px">'+next.detail+'</p><div class="workflow-map">'+steps.map((s,i)=>'<span class="'+(i+1===next.step?'current':'')+'">'+(i+1)+' · '+s+'</span>').join('')+'</div></div><button class="btn primary" id="v35-next-button">Continue →</button>';
    card.querySelector('#v35-next-button').addEventListener('click',()=>nav?.querySelector('[data-view="'+next.view+'"]')?.click());
  }
  nav?.querySelector('[data-view="dashboard"]')?.addEventListener('click',()=>setTimeout(renderNext,0));

  function fieldContainer(control){return control.closest('.field')||control.parentElement}
  function clearError(control){
    control.classList.remove('field-error-control');
    const box=fieldContainer(control);box?.querySelectorAll('.field-error-text').forEach(x=>x.remove());
  }
  function markError(control,message){
    if(!control)return;clearError(control);control.classList.add('field-error-control');
    const text=document.createElement('span');text.className='field-error-text';text.textContent=message;
    fieldContainer(control)?.appendChild(text);
  }
  function clearSummary(form){form?.querySelector(':scope > .validation-summary')?.remove()}
  function fail(form,errors){
    errors=errors.filter(x=>x.control);
    if(!errors.length)return false;
    errors.forEach(x=>markError(x.control,x.message));clearSummary(form);
    const summary=document.createElement('div');summary.className='validation-summary';
    summary.innerHTML='<strong>'+errors.length+' item'+(errors.length===1?'':'s')+' require attention</strong><span>Correct the highlighted fields below.</span><div></div>';
    const links=summary.lastElementChild;
    errors.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+x.message;b.addEventListener('click',()=>{x.control.scrollIntoView({behavior:'smooth',block:'center'});x.control.focus?.()});links.appendChild(b);links.appendChild(document.createElement('br'))});
    form.prepend(summary);errors[0].control.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>errors[0].control.focus?.(),250);
    return true;
  }
  document.addEventListener('input',e=>{if(e.target.matches('input,select,textarea'))clearError(e.target)},true);
  document.addEventListener('change',e=>{if(e.target.matches('input,select,textarea'))clearError(e.target)},true);
  document.addEventListener('invalid',e=>{markError(e.target,'This field is required.');setTimeout(()=>e.target.scrollIntoView({behavior:'smooth',block:'center'}),0)},true);

  const classification=document.getElementById('v35-classification-form');
  classification?.addEventListener('submit',e=>{
    clearSummary(classification);const errors=[],status=document.getElementById('v35-equipment-status')?.value;
    classification.querySelectorAll('[required]').forEach(x=>{if(!x.value)errors.push({control:x,message:'Select or enter '+(x.closest('.field')?.querySelector('label')?.textContent.trim()||'this required item')+'.'})});
    if(status==='active'){
      [['v35-trailer-gvwr','Enter the verified trailer GVWR.'],['v35-truck-empty','Enter the verified truck empty weight.'],['v35-trailer-empty','Enter the verified trailer empty weight.'],['v35-gcwr','Enter the manufacturer GCWR.']].forEach(([id,message])=>{const x=document.getElementById(id);if(!Number(x?.value))errors.push({control:x,message})});
      [['v35-insurance-ok','Confirm insurance and cargo coverage.'],['v35-authority-ok','Confirm operating authority.'],['v35-driver-ok','Confirm driver qualification.'],['v35-equipment-ok','Confirm equipment safety.']].forEach(([id,message])=>{const x=document.getElementById(id);if(!x?.checked)errors.push({control:x,message})});
    }
    if(fail(classification,errors)){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  [['fleet-driver-form','driver'],['fleet-truck-form','truck'],['fleet-trailer-form','trailer']].forEach(([id,type])=>{
    const form=document.getElementById(id);form?.addEventListener('submit',e=>{
      clearSummary(form);const data=new FormData(form),active=data.get('status')==='active',errors=[];
      if(active&&type==='driver'){if(!String(data.get('licenseState')||'').trim())errors.push({control:form.elements.licenseState,message:'Enter the driver license state.'});if(!data.get('expiration'))errors.push({control:form.elements.expiration,message:'Enter the driver license expiration date.'})}
      if(active&&type==='truck'){[['vin','Enter the truck VIN.'],['gvwr','Enter the verified truck GVWR.'],['gcwr','Enter the manufacturer GCWR.'],['emptyWeight','Enter the verified truck empty weight.']].forEach(([name,message])=>{if(!data.get(name))errors.push({control:form.elements[name],message})})}
      if(active&&type==='trailer'){[['vin','Enter the trailer VIN.'],['gvwr','Enter the verified trailer GVWR.'],['emptyWeight','Enter the verified trailer empty weight.']].forEach(([name,message])=>{if(!data.get(name))errors.push({control:form.elements[name],message})})}
      if(fail(form,errors)){e.preventDefault();e.stopImmediatePropagation()}
    },true)
  });

  const decision=document.getElementById('v35-decision-form');
  decision?.addEventListener('submit',e=>{
    clearSummary(decision);const errors=[],req=[['v35-loaded-miles','Enter loaded miles.'],['v35-deadhead-miles','Enter deadhead-to-pickup miles.'],['v35-offer','Enter the offered rate.'],['v35-cargo-weight','Enter cargo/load weight.'],['v35-fuel-price','Enter fuel price per gallon.']];
    req.forEach(([id,message])=>{const x=document.getElementById(id);if(x?.value===''||!Number.isFinite(Number(x?.value)))errors.push({control:x,message})});
    if(document.getElementById('v35-mpg-mode')?.value==='separate'){
      [['v35-loaded-mpg','Enter loaded MPG.'],['v35-empty-mpg','Enter empty/deadhead MPG.']].forEach(([id,message])=>{const x=document.getElementById(id);if(!(Number(x?.value)>0))errors.push({control:x,message})})
    }else{const x=document.getElementById('v35-mpg');if(!(Number(x?.value)>0))errors.push({control:x,message:'Enter average blended MPG.'})}
    if(fail(decision,errors)){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  function canvasBlank(canvas){try{return !Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data).some((v,i)=>i%4===3&&v)}catch(error){return true}}
  [['save-pickup','pickup-name','pickup-signature','Enter the person who signed at pickup.','Capture the pickup signature.'],['save-delivery','delivery-name','delivery-signature','Enter the person who received the load.','Capture the delivery signature.']].forEach(([buttonId,nameId,canvasId,nameMessage,signatureMessage])=>{
    document.getElementById(buttonId)?.addEventListener('click',e=>{
      const button=e.currentTarget,panel=button.closest('.panel'),name=document.getElementById(nameId),canvas=document.getElementById(canvasId),errors=[];
      clearSummary(panel);if(!name?.value.trim())errors.push({control:name,message:nameMessage});if(canvasBlank(canvas))errors.push({control:canvas,message:signatureMessage});
      if(fail(panel,errors)){e.preventDefault();e.stopImmediatePropagation()}
    },true)
  });
  document.addEventListener('submit',()=>setTimeout(renderNext,250));
  ['save-pickup','save-delivery'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(renderNext,250)));
  nav?.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>setTimeout(renderNext,50)));
  renderNext();
})();