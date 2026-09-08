(() => {
  const proposalKey='flt-v38-accepted-proposal';
  const lastDecisionKey='flt-v35-last-decision';
  const zipCacheKey='flt-us-zip-cache-v1';
  const fiveZip=value=>{const match=String(value||'').trim().match(/^(\d{5})(?:-\d{4})?$/);return match?match[1]:''};
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(error){return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){return false}};
  const decisionAccepted=decision=>decision?.decision==='ACCEPT LOAD';
  const proposalReady=proposal=>Boolean(proposal&&fiveZip(proposal.pickupZip)&&fiveZip(proposal.deliveryZip)&&Number(proposal.offer)>0&&Number(proposal.cargoWeight)>=0&&Number(proposal.loadedMiles)>=0&&Number(proposal.deadheadMiles)>=0);
  const acceptedProposal=()=>read(proposalKey,null);
  const canCompleteLoad=()=>proposalReady(acceptedProposal());

  window.FLTFastLoadWorkflow={fiveZip,decisionAccepted,proposalReady,acceptedProposal,canCompleteLoad};
  if(typeof document==='undefined')return;

  const $=id=>document.getElementById(id);
  const nav=$('nav');
  const decisionForm=$('v35-decision-form');
  const loadForm=$('load-form');
  if(!nav||!decisionForm||!loadForm)return;

  const style=document.createElement('style');
  style.id='v38-fast-load-workflow-style';
  style.textContent=`
    .v38-quick-section{grid-column:1/-1;border:2px solid var(--green-2);background:#f5f9f4;border-radius:8px;padding:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .v38-quick-section .full{grid-column:1/-1}.v38-quick-title{grid-column:1/-1}.v38-quick-title h3{font-size:17px}.v38-quick-title p{margin-top:4px}
    .v38-training-next{border:3px solid #d4b900!important;background:#fffde8!important;box-shadow:0 0 0 5px rgba(207,232,106,.48)!important}
    .v38-training-note{display:block;margin-top:5px;color:var(--green);font-size:11px;font-weight:800}
    .v38-accepted-banner{grid-column:1/-1;border-left:5px solid var(--lime);background:#f4f7e5;padding:12px 14px;border-radius:6px}
    .v38-source-note{font-size:11px;color:var(--green-2);font-weight:800;margin-top:4px}
    .v38-decision-actions{display:grid;gap:8px;margin-top:12px}.v38-decision-actions .btn{width:100%}
    @media(max-width:700px){.v38-quick-section{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const loadNav=nav.querySelector('[data-view="load"]');
  const decisionNav=nav.querySelector('[data-view="intelligence"]');
  if(decisionNav?.querySelector('.nav-label'))decisionNav.querySelector('.nav-label').textContent='1 · Evaluate Proposed Load';
  if(loadNav?.querySelector('.nav-label'))loadNav.querySelector('.nav-label').textContent='2 · Complete Accepted Load';

  const firstDecisionField=decisionForm.querySelector('.field');
  const quick=document.createElement('div');
  quick.className='v38-quick-section';
  quick.innerHTML=`
    <div class="v38-quick-title"><div class="eyebrow">Step 1 · Fast load decision</div><h3>Enter only what changes for this proposed load</h3><p class="subtle">Driver, truck, trailer, verified weights, ratings, MPG, and recurring cost assumptions are reusable setup data. Decide profitability before entering detailed customer/facility information.</p></div>
    <div class="field"><label>Load source</label><select id="v38-quick-source" data-v38-required="true"><option value="">Select source</option><option>Load Board</option><option>Load App</option><option>Auto Auction</option><option>Broker</option><option>Direct Customer</option><option>Internal / Own Customer</option><option>Other</option></select></div>
    <div class="field"><label>Source / broker / app name</label><input id="v38-quick-source-name" placeholder="e.g. Central Dispatch"></div>
    <div class="field"><label>Pickup ZIP</label><input id="v38-quick-pickup-zip" inputmode="numeric" maxlength="10" data-v38-required="true"><span class="v38-source-note" id="v38-quick-pickup-place"></span></div>
    <div class="field"><label>Delivery ZIP</label><input id="v38-quick-delivery-zip" inputmode="numeric" maxlength="10" data-v38-required="true"><span class="v38-source-note" id="v38-quick-delivery-place"></span></div>
    <div class="field full"><label>Load / auction / broker reference</label><input id="v38-quick-reference" placeholder="Optional until known"></div>`;
  decisionForm.insertBefore(quick,firstDecisionField);

  const fields={source:$('v38-quick-source'),sourceName:$('v38-quick-source-name'),pickupZip:$('v38-quick-pickup-zip'),deliveryZip:$('v38-quick-delivery-zip'),reference:$('v38-quick-reference')};
  [fields.pickupZip,fields.deliveryZip].forEach(input=>input.addEventListener('input',()=>{input.value=input.value.replace(/[^\d-]/g,'').slice(0,10)}));

  async function resolveZip(input,note){
    const zip=fiveZip(input.value);if(!zip){note.textContent='';return null}
    const cached=read(zipCacheKey,{})?.[zip];
    if(cached?.city&&cached?.state){note.textContent=cached.city+', '+cached.state;return cached}
    try{
      const response=await fetch(`https://api.zippopotam.us/us/${zip}`);if(!response.ok)throw new Error('not found');
      const data=await response.json(),place=data?.places?.[0];if(!place)throw new Error('not found');
      const result={city:place['place name']||'',state:place['state abbreviation']||''};
      note.textContent=result.city+', '+result.state;
      const cache=read(zipCacheKey,{})||{};cache[zip]=result;write(zipCacheKey,cache);return result;
    }catch(error){note.textContent='ZIP entered; city/state will be confirmed after acceptance.';return null}
  }
  fields.pickupZip.addEventListener('change',()=>resolveZip(fields.pickupZip,$('v38-quick-pickup-place')));
  fields.deliveryZip.addEventListener('change',()=>resolveZip(fields.deliveryZip,$('v38-quick-delivery-place')));

  const decisionCard=$('v35-decision-card');
  const actions=document.createElement('div');actions.className='v38-decision-actions';
  actions.innerHTML='<button type="button" class="btn primary" id="v38-accept-proposal" hidden>Accept This Load → Complete Details</button><div class="subtle" id="v38-decision-next">Run the load decision first.</div>';
  decisionCard?.appendChild(actions);

  function currentProposal(){
    const decision=read(lastDecisionKey,null);
    return{
      source:fields.source.value,sourceName:fields.sourceName.value.trim(),sourceReference:fields.reference.value.trim(),
      pickupZip:fiveZip(fields.pickupZip.value),deliveryZip:fiveZip(fields.deliveryZip.value),
      pickupPlace:$('v38-quick-pickup-place').textContent.trim(),deliveryPlace:$('v38-quick-delivery-place').textContent.trim(),
      loadedMiles:Number($('v35-loaded-miles')?.value||0),deadheadMiles:Number($('v35-deadhead-miles')?.value||0),
      offer:Number($('v35-offer')?.value||0),cargoWeight:Number($('v35-cargo-weight')?.value||0),
      decision:decision?.decision||'',metrics:decision?.metrics||{},acceptedAt:new Date().toISOString()
    };
  }

  function quickReady(){
    return Boolean(fields.source.value&&fiveZip(fields.pickupZip.value)&&fiveZip(fields.deliveryZip.value));
  }
  function syncDecisionAction(){
    const decision=read(lastDecisionKey,null),button=$('v38-accept-proposal'),note=$('v38-decision-next');
    const accepted=decisionAccepted(decision)&&quickReady();
    button.hidden=!accepted;
    if(!quickReady())note.textContent='Complete Load Source, Pickup ZIP, and Delivery ZIP before accepting the decision.';
    else if(decision?.decision==='ACCEPT LOAD')note.textContent='Profitable and eligible. Accept the proposal, then enter operational details.';
    else if(decision?.decision==='NEGOTIATE RATE')note.textContent='Negotiate first. Update the offered rate and rerun the decision.';
    else if(decision?.decision==='PASS ON LOAD')note.textContent='Do not spend time building a load record for this offer.';
    else if(decision?.decision==='DO NOT DISPATCH')note.textContent='Hard safety/compliance stop. Detailed load setup remains blocked.';
    else note.textContent='Run the load decision before entering detailed customer/facility information.';
    trainingHighlight();
  }
  decisionForm.addEventListener('submit',()=>setTimeout(syncDecisionAction,25));
  [fields.source,fields.pickupZip,fields.deliveryZip].forEach(control=>control.addEventListener('change',syncDecisionAction));

  $('v38-accept-proposal').addEventListener('click',async()=>{
    const decision=read(lastDecisionKey,null);if(!decisionAccepted(decision)||!quickReady())return;
    const pickup=await resolveZip(fields.pickupZip,$('v38-quick-pickup-place'));
    const delivery=await resolveZip(fields.deliveryZip,$('v38-quick-delivery-place'));
    const proposal={...currentProposal(),pickupCity:pickup?.city||'',pickupState:pickup?.state||'',deliveryCity:delivery?.city||'',deliveryState:delivery?.state||''};
    write(proposalKey,proposal);applyProposalToLoadForm(proposal);loadNav?.click();setTimeout(trainingHighlight,80);
    if(typeof toast==='function')toast('Load accepted. Complete the operational details; decision data carried forward automatically.');
  });

  function setValue(id,value,locked=false){const control=$(id);if(!control||value===undefined||value===null)return;control.value=String(value);if(locked){control.readOnly=true;control.classList.add('auto-filled-control')}}
  function applyProposalToLoadForm(proposal=acceptedProposal()){
    if(!proposalReady(proposal))return false;
    let banner=$('v38-accepted-proposal-banner');
    if(!banner){banner=document.createElement('div');banner.id='v38-accepted-proposal-banner';banner.className='v38-accepted-banner';loadForm.prepend(banner)}
    banner.innerHTML='<strong>Accepted load decision carried forward.</strong><br><span class="subtle">'+[proposal.source,proposal.sourceName,proposal.pickupZip+' → '+proposal.deliveryZip,'Offer $'+Number(proposal.offer).toLocaleString()].filter(Boolean).join(' · ')+'</span><div class="v38-source-note">Rate and cargo weight are locked to the accepted decision. Return to Evaluate Proposed Load to change them.</div>';
    setValue('pickup-zip',proposal.pickupZip);setValue('pickup-city',proposal.pickupCity);setValue('pickup-state',proposal.pickupState);
    setValue('delivery-zip',proposal.deliveryZip);setValue('delivery-city',proposal.deliveryCity);setValue('delivery-state',proposal.deliveryState);
    setValue('quoted-revenue',proposal.offer,true);setValue('load-weight',proposal.cargoWeight,true);
    const ref=$('load-reference');if(ref&&!ref.value&&proposal.sourceReference)ref.value=proposal.sourceReference;
    ['pickup-city','pickup-state','delivery-city','delivery-state'].forEach(id=>$(id)?.setAttribute('data-v38-autofill','true'));
    return true;
  }

  loadNav?.addEventListener('click',event=>{
    if(canCompleteLoad()){applyProposalToLoadForm();return}
    event.preventDefault();event.stopImmediatePropagation();decisionNav?.click();
    if(typeof toast==='function')toast('Evaluate profitability and accept the proposed load before entering detailed customer and facility information.');
    setTimeout(trainingHighlight,50);
  },true);

  const loadTitle=$('load')?.querySelector('.section-head h2');if(loadTitle)loadTitle.textContent='Complete accepted load details';
  const loadEyebrow=$('load')?.querySelector('.section-head .eyebrow');if(loadEyebrow)loadEyebrow.textContent='Step 2 · Operational details after acceptance';
  const loadNotice=$('load')?.querySelector('.notice');if(loadNotice)loadNotice.textContent='Profitability and equipment fit are decided first. Now complete only the operational details that could not be known during the quick decision.';
  const pickupHeading=$('pickup-facility')?.closest('.address-section')?.querySelector('h3');if(pickupHeading)pickupHeading.textContent='Pickup Facility / Contact';
  const deliveryHeading=$('delivery-facility')?.closest('.address-section')?.querySelector('h3');if(deliveryHeading)deliveryHeading.textContent='Delivery Facility / Contact';

  function requirementResolved(control){
    if(control.disabled||control.readOnly)return true;
    if(control.dataset.v38Autofill==='true'){
      const prefix=control.id.startsWith('pickup-')?'pickup':'delivery';return Boolean(fiveZip($(prefix+'-zip')?.value));
    }
    if(control.type==='checkbox'||control.type==='radio')return control.checked;
    if(/zip$/i.test(control.id||''))return Boolean(fiveZip(control.value));
    if(control.validity&&control.validity.valid===false)return false;
    return String(control.value||'').trim()!=='';
  }
  function candidatesInActiveView(){
    const active=document.querySelector('.view.active');if(!active)return[];
    const controls=[...active.querySelectorAll('[data-v38-required="true"],input[required],select[required],textarea[required]')];
    return controls.filter(control=>control.offsetParent!==null&&!requirementResolved(control));
  }
  function trainingHighlight(){
    document.querySelectorAll('.v38-training-next').forEach(control=>control.classList.remove('v38-training-next'));
    document.querySelectorAll('.v38-training-note[data-v38-training]').forEach(note=>note.remove());
    const next=candidatesInActiveView()[0];if(!next)return;
    next.classList.add('v38-training-next');
    const note=document.createElement('span');note.className='v38-training-note';note.dataset.v38Training='true';note.textContent='NEXT · Complete this item to keep moving.';
    next.insertAdjacentElement('afterend',note);
  }
  document.addEventListener('input',event=>{if(event.target.matches('input,select,textarea'))setTimeout(trainingHighlight,0)},true);
  document.addEventListener('change',event=>{if(event.target.matches('input,select,textarea'))setTimeout(trainingHighlight,0)},true);
  nav.addEventListener('click',()=>setTimeout(trainingHighlight,60));

  applyProposalToLoadForm();syncDecisionAction();setTimeout(trainingHighlight,50);
})();
