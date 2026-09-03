(() => {
  if(document.getElementById('v35-guided-workflow-style'))return;
  const style=document.createElement('style');
  style.id='v35-guided-workflow-style';
  style.textContent=`
    .field-error-control{border:2px solid var(--red)!important;background:#fff3f1!important;box-shadow:0 0 0 3px rgba(185,76,72,.12)!important}
    .field-error-text{display:block;color:var(--red);font-size:12px;font-weight:700;margin-top:5px}
    .guided-current-control{border:3px solid #d4b900!important;background:#fffde8!important;box-shadow:0 0 0 5px rgba(207,232,106,.48)!important;animation:guidedPulse 1.2s ease-in-out infinite alternate}
    .guided-field-banner{display:grid;gap:3px;border-left:5px solid var(--lime);background:#f7fbdc;color:var(--ink);padding:10px 12px;border-radius:6px;margin:0 0 9px}
    .guided-field-banner strong{font-size:10px;letter-spacing:.12em;color:var(--green);text-transform:uppercase}.guided-field-banner small{color:var(--muted)}
    @keyframes guidedPulse{from{box-shadow:0 0 0 4px rgba(207,232,106,.35)}to{box-shadow:0 0 0 8px rgba(207,232,106,.62)}}
    .validation-summary{border:1px solid #e1aaa5;border-left:5px solid var(--red);background:#fff3f1;color:#6f2926;padding:12px 14px;border-radius:7px;margin:0 0 16px}
    .validation-summary strong{display:block;margin-bottom:4px}.validation-summary button{border:0;background:transparent;color:#6f2926;text-decoration:underline;padding:2px 0;cursor:pointer;text-align:left}
    .next-action{display:flex;justify-content:space-between;gap:18px;align-items:center;border-left:5px solid var(--lime);margin:0 0 14px}
    .workflow-map{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.workflow-map span{font-size:11px;padding:5px 8px;border-radius:999px;background:#eef2eb;color:#506059}.workflow-map span.current{background:var(--lime);color:var(--ink);font-weight:800}
    #nav button.nav-required{background:#365247;color:#fff;box-shadow:inset 4px 0 var(--lime),0 0 0 1px rgba(207,232,106,.5)}
    #nav button.nav-required::after{content:'NEXT';margin-left:auto;background:var(--lime);color:var(--ink);font-size:9px;font-weight:900;letter-spacing:.08em;padding:3px 6px;border-radius:999px}
    #nav button.nav-required.active{background:#3f5e51}
    #nav button.nav-complete:not(.nav-required)::after{content:'✓';margin-left:auto;color:var(--lime);font-weight:900;font-size:14px}
    #nav button.nav-waiting:not(.nav-required){opacity:.68}
    .advanced-economics{border:1px solid var(--line);border-radius:8px;padding:0;background:#fbfcf8}
    .advanced-economics summary{cursor:pointer;padding:13px 15px;font-weight:800;color:var(--green);display:flex;justify-content:space-between;align-items:center}
    .advanced-economics summary span{font-size:10px;letter-spacing:.08em;background:#eef2eb;color:var(--muted);padding:3px 7px;border-radius:999px}
    .advanced-economics[open]{padding:0 15px 15px}.advanced-economics[open] summary{margin:0 -15px 10px;border-bottom:1px solid var(--line)}
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
  function workflowState(){
    const profile=read('flt-v34-business-profile'),classification=read('flt-v35-classification');
    const fleet=read('flt-v35-fleet',{drivers:[],trucks:[],trailers:[],locks:[]}),snapshots=read('flt-v35-estimate-snapshots',[]);
    const loads=read('flt-v32-loads',[]),selectedId=localStorage.getItem('flt-v32-loads-selected');
    const load=loads.find(x=>x.id===selectedId)||loads.at(-1)||null,isOperational=Boolean(load&&!String(load.id||'').startsWith('DEMO-'));
    const lock=Boolean(isOperational&&fleet.locks?.some(x=>x.loadId===load.id));
    const pickup=Boolean(isOperational&&load.pickupProof?.signature),delivery=Boolean(isOperational&&load.deliveryProof?.signature),invoice=Boolean(isOperational&&load.invoice?.number);
    const paid=isOperational?(load.payments||[]).reduce((sum,x)=>sum+Number(x.amount||0),0):0,balance=isOperational?Math.max(0,Number(load.revenue||0)-paid):0;
    return{profile,classification,fleet,snapshots,load,isOperational,lock,pickup,delivery,invoice,balance};
  }
  function driverReady(x){
    if(x?.status!=='active'||!x.licenseState||!x.expiration)return false;
    const expiration=new Date(x.expiration+'T23:59:59');
    return !Number.isNaN(expiration.getTime())&&expiration>=new Date();
  }
  function truckReady(x){
    return Boolean(x?.status==='active'&&validVin(x.vin)&&Number(x.gvwr)>0&&Number(x.gcwr)>0&&Number(x.emptyWeight)>0&&Number(x.frontGawr)>0&&Number(x.rearGawr)>0&&Number(x.frontTireCapacity)>=Number(x.frontGawr)&&Number(x.rearTireCapacity)>=Number(x.rearGawr)&&Number(x.hitchCapacity)>0&&validScaleDate(x.verificationDate)&&x.weightBasis==='scale-ticket'&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.gvwr)<=Number(x.gcwr));
  }
  function trailerReady(x){
    return Boolean(x?.status==='active'&&validVin(x.vin)&&Number(x.gvwr)>0&&Number(x.emptyWeight)>0&&Number(x.axleCapacity)>0&&Number(x.tireCapacity)>0&&Number(x.hitchCapacity)>0&&validScaleDate(x.verificationDate)&&x.weightBasis==='scale-ticket'&&Number(x.emptyWeight)<Number(x.gvwr));
  }
  function fleetReady(fleet){
    return Boolean(fleet?.drivers?.some(driverReady)&&fleet?.trucks?.some(truckReady)&&fleet?.trailers?.some(trailerReady));
  }
  function complianceReady(classification){
    return Boolean(classification?.insuranceOk&&classification?.authorityOk&&classification?.equipmentOk);
  }
  function complianceReviewed(classification){
    return ['insurance','authority','equipment'].every(key=>['pending','verified'].includes(classification?.[key+'Status']));
  }
  function businessComplianceErrors(){
    const view=viewNames.business,items=[];
    [
      ['v35-insurance-ok','Select the current insurance and cargo coverage status.'],
      ['v35-authority-ok','Select the current operating authority and service-area status.'],
      ['v35-equipment-ok','Select the current equipment-safety status.']
    ].forEach(([id,message])=>{
      const control=document.getElementById(id);
      if(control&&!control.value)items.push({control,message,view,resolved:()=>Boolean(control.value)});
    });
    return items;
  }
  function nextAction(){
    const s=workflowState();
    if(!s.profile)return{title:'Complete Business Setup',detail:'Save the company identity and operating state once so later records can auto-fill.',view:viewNames.business,step:1};
    if(!s.classification)return{title:'Save Operation Classification',detail:'Choose the company role, operating area, driver class, and planned equipment.',view:viewNames.business,step:2};
    if(!complianceReviewed(s.classification))return{title:'Record Current Business Compliance',detail:'Select the truthful current status for insurance, operating authority, and equipment safety. Pending statuses remain blocked.',view:viewNames.business,step:2,guide:'compliance'};
    if(!fleetReady(s.fleet))return{title:'Build the Reusable Fleet Records',detail:'Complete one driver, truck, and trailer record before evaluating or dispatching a load. Planned or incomplete records remain blocked.',view:viewNames.fleet,step:3};
    if(s.isOperational&&s.delivery&&(!s.invoice||s.balance>0))return{title:s.invoice?'Record Payment or Review Balance':'Generate the Invoice',detail:'Delivery is complete. Finish billing, expenses, payments, and final profit without reopening earlier stages.',view:viewNames.finance,step:9};
    if(s.isOperational&&s.delivery&&!s.snapshots.length)return{title:'Evaluate the Next Proposed Load',detail:'This load is complete. Start the next cycle with miles, offer, fuel, expenses, and profit requirements.',view:viewNames.intelligence,step:4};
    if(s.isOperational&&s.delivery&&!complianceReviewed(s.classification))return{title:'Record Current Business Compliance',detail:'Select the truthful current status for insurance, operating authority, and equipment safety. Pending statuses remain blocked.',view:viewNames.business,step:2,guide:'compliance'};
    if(s.isOperational&&s.delivery&&!fleetReady(s.fleet))return{title:'Verify Fleet Before Final Acceptance',detail:'Complete one current driver and Active / Verified truck and trailer record. Missing ratings keep final acceptance blocked.',view:viewNames.fleet,step:3};
    if(s.isOperational&&s.delivery&&!complianceReady(s.classification))return{title:'Activate Business Compliance',detail:'Insurance, operating authority, or equipment safety is still pending. Final acceptance and dispatch remain blocked until verified.',view:viewNames.business,step:2};
    if(s.isOperational&&s.delivery)return{title:'Accept & Create the Load',detail:'The estimate is saved and all required reusable records are verified. Review the final decision before creating the load.',view:viewNames.load,step:5};
    if(s.isOperational&&s.pickup&&!s.delivery)return{title:'Capture Delivery Proof',detail:'Pickup is complete. Record the receiver and signature to close the chain of custody.',view:viewNames.delivery,step:8};
    if(s.isOperational&&!s.lock)return{title:'Verify and Lock the Dispatch Assignment',detail:'Select an eligible driver, truck, and trailer before pickup. Planned or incomplete records remain blocked.',view:viewNames.fleet,step:6};
    if(s.isOperational&&!s.pickup)return{title:'Capture Pickup Proof',detail:'Dispatch is locked. Record the signer and signature before leaving the pickup location.',view:viewNames.pickup,step:7};
    if(!s.snapshots.length||s.isOperational)return{title:'Evaluate the Next Proposed Load',detail:'Start the next cycle with miles, offer, fuel, expenses, and profit requirements.',view:viewNames.intelligence,step:4};
    if(!fleetReady(s.fleet))return{title:'Verify Fleet Before Final Acceptance',detail:'The rate can be reviewed now, but final acceptance requires one current driver and Active / Verified truck and trailer records with complete ratings.',view:viewNames.fleet,step:3};
    return{title:'Accept & Create the Load',detail:'The economic estimate is saved and verified fleet records are available. Review the final decision before creating the load.',view:viewNames.load,step:5};
  }
  const dashboard=document.getElementById('dashboard');
  const hero=dashboard?.querySelector('.hero');
  if(dashboard&&hero&&!document.getElementById('v35-next-action')){
    const card=document.createElement('div');card.id='v35-next-action';card.className='panel next-action';
    hero.insertAdjacentElement('afterend',card);
  }
  function renderNext(){
    const next=nextAction(),s=workflowState(),steps=['Business','Classification','Fleet','Evaluate','Create Load','Dispatch','Pickup','Delivery','Invoice'];
    const selectedLoadComplete=Boolean(s.load?.id&&s.load.customer&&s.load.pickup&&s.load.delivery&&s.load.date&&Number.isFinite(Number(s.load.revenue)));
    const selectedPickupComplete=Boolean(s.load?.pickupProof?.signature);
    const selectedDeliveryComplete=Boolean(s.load?.deliveryProof?.signature);
    const selectedInvoiceComplete=Boolean(s.load?.invoice?.number&&Array.isArray(s.load.expenses)&&s.load.expenses.every(item=>Number.isFinite(Number(item.amount))));
    const complete={dashboard:false,'business-setup':Boolean(s.profile&&s.classification&&complianceReady(s.classification)),fleet:fleetReady(s.fleet),intelligence:Boolean(s.snapshots.length),load:selectedLoadComplete,pickup:selectedPickupComplete,delivery:selectedDeliveryComplete,finance:selectedInvoiceComplete,test:false};
    nav?.querySelectorAll('button').forEach(button=>{const required=button.dataset.view===next.view;button.classList.toggle('nav-required',required);button.classList.toggle('nav-complete',Boolean(complete[button.dataset.view]));button.classList.toggle('nav-waiting',!required&&!complete[button.dataset.view]&&button.dataset.view!=='dashboard'&&button.dataset.view!=='test')});
    const card=document.getElementById('v35-next-action');if(!card)return;
    card.innerHTML='<div><div class="eyebrow">Next required action</div><h2>'+next.title+'</h2><p class="subtle" style="margin-top:5px">'+next.detail+'</p><div class="workflow-map">'+steps.map((s,i)=>'<span class="'+(i+1===next.step?'current':'')+'">'+(i+1)+' · '+s+'</span>').join('')+'</div></div><button class="btn primary" id="v35-next-button">Continue →</button>';
    card.querySelector('#v35-next-button').addEventListener('click',()=>nav?.querySelector('[data-view="'+next.view+'"]')?.click());
  }
  nav?.querySelector('[data-view="dashboard"]')?.addEventListener('click',()=>setTimeout(renderNext,0));
  document.getElementById('business-profile-form')?.addEventListener('submit',()=>setTimeout(renderNext,0));
  document.getElementById('v35-classification-form')?.addEventListener('submit',()=>setTimeout(renderNext,0));
  ['fleet-driver-form','fleet-truck-form','fleet-trailer-form','fleet-lock-form'].forEach(id=>document.getElementById(id)?.addEventListener('submit',()=>setTimeout(renderNext,0)));
  document.getElementById('v35-decision-form')?.addEventListener('submit',()=>setTimeout(renderNext,0));
  nav?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-view]');
    if(!button)return;
    const next=nextAction();
    if(button.dataset.view===next.view&&next.guide==='compliance')setTimeout(()=>startGuide(businessComplianceErrors()),120);
  });

  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const validScaleDate=value=>{const raw=String(value||'').trim(),iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/),us=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/),parts=iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:us?[Number(us[3]),Number(us[1]),Number(us[2])]:null;if(!parts)return false;const [year,month,day]=parts,parsed=new Date(year,month-1,day),today=new Date();if(parsed.getFullYear()!==year||parsed.getMonth()!==month-1||parsed.getDate()!==day)return false;return year*10000+month*100+day<=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate()};
  let guidedQueue=[],guidedTotal=0;
  function fieldContainer(control){return control?.closest?.('.field')||control?.closest?.('.choice')||control?.parentElement}
  function clearError(control){
    if(!control)return;control.classList.remove('field-error-control','guided-current-control');
    const box=fieldContainer(control);box?.querySelectorAll('.field-error-text').forEach(x=>x.remove());
  }
  function markError(control,message){
    if(!control)return;clearError(control);control.classList.add('field-error-control');
    const text=document.createElement('span');text.className='field-error-text';text.textContent=message;
    fieldContainer(control)?.appendChild(text);
  }
  function clearSummary(form){form?.querySelector(':scope > .validation-summary')?.remove()}
  function defaultResolved(control){
    if(!control)return false;
    if(control.type==='checkbox'||control.type==='radio')return control.checked;
    return String(control.value??'').trim()!=='';
  }
  function clearGuideVisuals(){
    document.querySelectorAll('.guided-current-control').forEach(x=>x.classList.remove('guided-current-control'));
    document.querySelectorAll('.guided-field-banner').forEach(x=>x.remove());
  }
  function showGuidedField(){
    clearGuideVisuals();
    const item=guidedQueue[0];if(!item)return;
    const openAndFocus=()=>{
      const control=item.control;if(!control||!document.body.contains(control)){guidedQueue.shift();showGuidedField();return}
      const details=control.closest('details');if(details)details.open=true;
      markError(control,item.message);control.classList.add('guided-current-control');
      const box=fieldContainer(control),banner=document.createElement('div');banner.className='guided-field-banner';
      const position=guidedTotal-guidedQueue.length+1;
      banner.innerHTML='<strong>Next required field · '+position+' of '+guidedTotal+'</strong><span>'+item.message+'</span><small>Complete this highlighted box to move automatically to the next missing item.</small>';
      box?.prepend(banner);box?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>control.focus?.(),250);
    };
    if(item.view){
      const button=nav?.querySelector('[data-view="'+item.view+'"]');
      if(button&&!button.classList.contains('active')){button.click();setTimeout(openAndFocus,80);return}
    }
    openAndFocus();
  }
  function startGuide(errors){
    guidedQueue=errors.filter(x=>x.control);guidedTotal=guidedQueue.length;
    if(!guidedQueue.length)return false;showGuidedField();return true;
  }
  function advanceGuide(control){
    const item=guidedQueue[0];if(!item||item.control!==control)return;
    const resolved=item.resolved?item.resolved():defaultResolved(control);
    if(!resolved){showGuidedField();return}
    clearError(control);guidedQueue.shift();showGuidedField();
  }
  function fail(form,errors){
    errors=errors.filter(x=>x.control);
    if(!errors.length)return false;
    clearSummary(form);startGuide(errors);return true;
  }
  document.addEventListener('input',e=>{
    if(!e.target.matches('input,select,textarea'))return;
    if(guidedQueue[0]?.control!==e.target)clearError(e.target);
  },true);
  document.addEventListener('change',e=>{
    if(!e.target.matches('input,select,textarea'))return;
    if(guidedQueue[0]?.control===e.target)advanceGuide(e.target);else clearError(e.target);
  },true);
  document.addEventListener('invalid',e=>{
    e.preventDefault();startGuide([{control:e.target,message:'This field is required.'}]);
  },true);

  function dispatchQualificationErrors(){
    const items=[],view=viewNames.business;
    const add=(id,message,resolved)=>{
      const control=document.getElementById(id);
      if(control&&!(resolved?resolved():defaultResolved(control)))items.push({control,message,view,resolved});
    };
    add('v35-primary-operation','Select the primary commercial operation.');
    add('v35-company-role','Select the company role.');
    add('v35-driver-class','Select the driver qualification.');
    add('v35-operating-area','Select the operating area.');
    add('v35-vehicle-config','Select the vehicle configuration.');
    add('v35-insurance-ok','Select the current insurance and cargo coverage status.');
    add('v35-authority-ok','Select the current authority and operating-area status.');
    add('v35-equipment-ok','Select the current equipment safety-verification status.');
    return items;
  }

  const classification=document.getElementById('v35-classification-form');
  classification?.addEventListener('submit',e=>{
    clearSummary(classification);const errors=[];
    classification.querySelectorAll('[required]').forEach(x=>{if(!x.value)errors.push({control:x,message:'Select or enter '+(x.closest('.field')?.querySelector('label')?.textContent.trim()||'this required item')+'.'})});
    [['v35-insurance-ok','Select the current insurance and cargo coverage status.'],['v35-authority-ok','Select the current authority and operating-area status.'],['v35-equipment-ok','Select the current equipment safety-verification status.']].forEach(([id,message])=>{const x=document.getElementById(id);if(!x?.value)errors.push({control:x,message})});
    if(fail(classification,errors)){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  [['fleet-driver-form','driver'],['fleet-truck-form','truck'],['fleet-trailer-form','trailer']].forEach(([id,type])=>{
    const form=document.getElementById(id);form?.addEventListener('submit',e=>{
      clearSummary(form);const data=new FormData(form),active=data.get('status')==='active',errors=[];
      const identity=type==='driver'?['name','Enter the driver name or internal ID.']:['unit','Enter the '+type+' unit ID.'];
      if(!String(data.get(identity[0])||'').trim())errors.push({control:form.elements[identity[0]],message:identity[1]});
      if(active&&type==='driver'){if(!String(data.get('licenseState')||'').trim())errors.push({control:form.elements.licenseState,message:'Enter the driver license state.'});if(!data.get('expiration'))errors.push({control:form.elements.expiration,message:'Enter the driver license expiration date.'})}
      if(active&&type==='truck'){[['vin','Enter the complete 17-character truck VIN.',validVin],['gvwr','Enter the verified truck GVWR.',v=>Number(v)>0],['gcwr','Enter the manufacturer GCWR.',v=>Number(v)>0],['emptyWeight','Enter the ready-to-work truck scale weight.',v=>Number(v)>0],['frontGawr','Enter the manufacturer front GAWR.',v=>Number(v)>0],['rearGawr','Enter the manufacturer rear GAWR.',v=>Number(v)>0],['frontTireCapacity','Enter the verified front-axle tire capacity.',v=>Number(v)>0],['rearTireCapacity','Enter the verified rear-axle tire capacity.',v=>Number(v)>0],['hitchCapacity','Enter the verified truck hitch rating.',v=>Number(v)>0],['verificationDate','Enter a truck scale date that is not in the future.',validScaleDate],['weightBasis','Select Scale ticket — full fuel and normal equipment.',v=>v==='scale-ticket']].forEach(([name,message,valid])=>{if(!valid(data.get(name)))errors.push({control:form.elements[name],message,resolved:()=>valid(form.elements[name]?.value)})})}
      if(active&&type==='trailer'){[['vin','Enter the complete 17-character trailer VIN.',validVin],['gvwr','Enter the verified trailer GVWR.',v=>Number(v)>0],['emptyWeight','Enter the ready-to-work trailer scale weight.',v=>Number(v)>0],['axleCapacity','Enter the trailer combined axle rating.',v=>Number(v)>0],['tireCapacity','Enter the lowest verified trailer tire capacity.',v=>Number(v)>0],['hitchCapacity','Enter the verified hitch/coupler rating.',v=>Number(v)>0],['verificationDate','Enter a trailer scale date that is not in the future.',validScaleDate],['weightBasis','Select Scale ticket — normal equipment included.',v=>v==='scale-ticket']].forEach(([name,message,valid])=>{if(!valid(data.get(name)))errors.push({control:form.elements[name],message,resolved:()=>valid(form.elements[name]?.value)})})}
      if(fail(form,errors)){e.preventDefault();e.stopImmediatePropagation()}
      else{guidedQueue=[];guidedTotal=0;clearGuideVisuals();form.querySelectorAll('.field-error-control').forEach(clearError)}
    },true)
  });

  const decision=document.getElementById('v35-decision-form');
  decision?.addEventListener('submit',e=>{
    clearSummary(decision);const errors=[],selectors=[['v35-estimate-driver','Select the saved driver for this estimate.'],['v35-estimate-truck','Select the saved truck for this estimate.'],['v35-estimate-trailer','Select the saved trailer for this estimate.']],req=[['v35-loaded-miles','Enter loaded miles.'],['v35-deadhead-miles','Enter deadhead-to-pickup miles.'],['v35-offer','Enter the offered rate.'],['v35-cargo-weight','Enter cargo/load weight.'],['v35-fuel-price','Enter fuel price per gallon.']];
    selectors.forEach(([id,message])=>{const x=document.getElementById(id);if(!x?.value)errors.push({control:x,message})});
    req.forEach(([id,message])=>{const x=document.getElementById(id);if(x?.value===''||!Number.isFinite(Number(x?.value)))errors.push({control:x,message})});
    if(document.getElementById('v35-mpg-mode')?.value==='separate'){
      [['v35-loaded-mpg','Enter loaded MPG.'],['v35-empty-mpg','Enter empty/deadhead MPG.']].forEach(([id,message])=>{const x=document.getElementById(id);if(!(Number(x?.value)>0))errors.push({control:x,message})})
    }else{const x=document.getElementById('v35-mpg');if(!(Number(x?.value)>0))errors.push({control:x,message:'Enter average blended MPG.'})}
    if(fail(decision,errors)){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  // Dispatch qualification guidance begins only after a load is accepted and created.

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
