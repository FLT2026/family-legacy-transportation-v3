(() => {
  'use strict';
  if(typeof document==='undefined'||window.FLTFirstLoadCleanup)return;

  const form=document.getElementById('v35-decision-form');
  if(!form)return;

  const $=id=>document.getElementById(id);
  const assumptionsKey='flt-v38-operating-assumptions';
  const proposalKey='flt-v38-accepted-proposal';
  const snapshotsKey='flt-v35-estimate-snapshots';
  const lastDecisionKey='flt-v35-last-decision';

  const read=(key,fallback=null)=>{
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}
    catch(error){return fallback}
  };
  const notify=message=>{try{if(typeof toast==='function')toast(message)}catch(error){}};

  const legacyDefaults={
    'v35-loaded-miles':'245',
    'v35-deadhead-miles':'35',
    'v35-offer':'1240',
    'v35-cargo-weight':'5000',
    'v35-fuel-price':'3.49',
    'v35-mpg':'9',
    'v35-maintenance':'.20',
    'v35-tires':'.05',
    'v35-tolls':'0',
    'v35-driver-pay':'0',
    'v35-fixed-cpm':'.35',
    'v35-dispatch-percent':'0',
    'v35-tarping':'0',
    'v35-detention':'0',
    'v35-other-accessorials':'0',
    'v35-target-profit':'350',
    'v35-return-deadhead':'0',
    'v35-parking':'0',
    'v35-permits':'0',
    'v35-lodging':'0',
    'v35-meals':'0',
    'v35-scales':'0',
    'v35-washout':'0',
    'v35-loading-cost':'0',
    'v35-securement-cost':'0',
    'v35-insurance-allocation':'0',
    'v35-other-costs':'0',
    'v35-factoring-percent':'0',
    'v35-min-profit':'0',
    'v35-target-margin':'0',
    'v35-profit-mile-floor':'0',
    'v35-trip-hours':'0',
    'v35-hourly-floor':'0',
    'v35-negotiation-percent':'5'
  };

  function hasSavedEvaluation(){
    const snapshots=read(snapshotsKey,[]);
    return Boolean(localStorage.getItem(lastDecisionKey)||read(proposalKey,null)||(Array.isArray(snapshots)&&snapshots.length));
  }

  function clearLegacyDefaults(){
    if(hasSavedEvaluation())return;
    Object.entries(legacyDefaults).forEach(([id,legacy])=>{
      const control=$(id);
      if(control&&String(control.value).trim()===legacy)control.value='';
    });
    const pickupDate=$('pickup-date');
    if(pickupDate&&pickupDate.value==='2026-08-22')pickupDate.value='';
    const quotedRevenue=$('quoted-revenue');
    if(quotedRevenue&&quotedRevenue.value==='1240')quotedRevenue.value='';
  }

  function restoreExistingEvaluation(){
    const proposal=read(proposalKey,null);
    if(proposal){
      const map={
        'v35-offer':proposal.offer,
        'v35-cargo-weight':proposal.cargoWeight,
        'v35-loaded-miles':proposal.loadedMiles,
        'v35-deadhead-miles':proposal.deadheadMiles,
        'v35-mpg':proposal.averageMpg,
        'v35-fuel-price':proposal.fuelPrice
      };
      Object.entries(map).forEach(([id,value])=>{
        const control=$(id);
        if(control&&value!==null&&value!==undefined&&value!=='')control.value=String(value);
      });
      return true;
    }

    const snapshots=read(snapshotsKey,[]);
    const last=Array.isArray(snapshots)?snapshots.at(-1):null;
    if(!last)return false;
    const map={
      'v35-loaded-miles':last.inputs?.loadedMiles,
      'v35-deadhead-miles':last.inputs?.deadheadToPickup,
      'v35-return-deadhead':last.inputs?.returnDeadhead,
      'v35-offer':last.inputs?.offer,
      'v35-cargo-weight':last.inputs?.cargoWeight,
      'v35-fuel-price':last.inputs?.fuelPrice,
      'v35-mpg':last.inputs?.blendedMpg,
      'v35-loaded-mpg':last.inputs?.loadedMpg,
      'v35-empty-mpg':last.inputs?.emptyMpg,
      'v35-maintenance':last.inputs?.maintenanceReserve,
      'v35-tires':last.inputs?.tireReserve,
      'v35-fixed-cpm':last.inputs?.fixedCpm,
      'v35-target-profit':last.inputs?.targetProfit
    };
    Object.entries(map).forEach(([id,value])=>{
      const control=$(id);
      if(control&&value!==null&&value!==undefined&&Number.isFinite(Number(value)))control.value=String(value);
    });
    if($('v35-mpg-mode')&&last.inputs?.mpgMode)$('v35-mpg-mode').value=last.inputs.mpgMode;
    return true;
  }

  function applySavedAssumptions(){
    const saved=read(assumptionsKey,null);
    if(!saved)return;
    const map={
      'v35-mpg':saved.averageMpg,
      'v35-maintenance':saved.maintenanceReserve,
      'v35-tires':saved.tireReserve,
      'v35-fixed-cpm':saved.fixedCpm,
      'v35-target-profit':saved.targetProfit,
      'v35-loaded-mpg':saved.loadedMpg,
      'v35-empty-mpg':saved.emptyMpg
    };
    Object.entries(map).forEach(([id,value])=>{
      const control=$(id);
      if(control&&String(control.value||'').trim()===''&&value!==null&&value!==undefined)control.value=String(value);
    });
    if($('v35-mpg-mode')&&saved.mpgMode)$('v35-mpg-mode').value=saved.mpgMode;
  }

  function reorderFirstTimeFlow(){
    const quick=$('v38-quick-section');
    const core=$('v38-core-load-decision-fields');
    const master=$('v35-master-selection');

    if(quick&&form.firstElementChild!==quick)form.insertBefore(quick,form.firstElementChild);
    if(core&&quick&&quick.nextElementSibling!==core)quick.insertAdjacentElement('afterend',core);
    if(master&&core&&core.nextElementSibling!==master)core.insertAdjacentElement('afterend',master);

    const banner=document.querySelector('#intelligence .v35-banner');
    if(banner){
      const eyebrow=banner.querySelector('.eyebrow');
      const title=banner.querySelector('h2');
      const copy=banner.querySelector('.subtle');
      if(eyebrow)eyebrow.textContent='Evaluate Proposed Load';
      if(title)title.textContent='Fast Load Decision';
      if(copy)copy.textContent='Enter only what changes for this load. Saved driver, equipment, ratings, and recurring assumptions are reused automatically.';
    }

    if(core){
      const eyebrow=core.querySelector('.eyebrow');
      const copy=core.querySelector('.subtle');
      if(eyebrow)eyebrow.textContent='Step 2 · Load economics';
      if(copy)copy.textContent='Enter the offered rate, loaded miles, cargo weight, and deadhead for this proposed load.';
    }
  }

  function simplifyLegacyEconomicsPanel(){
    const section=$('v35-completion-fields');
    if(!section)return;
    const panel=section.querySelector('.panel');
    const head=panel?.querySelector('.section-head');
    if(head){
      const eyebrow=head.querySelector('.eyebrow');
      const title=head.querySelector('h2');
      const copy=head.querySelector('.subtle');
      if(eyebrow)eyebrow.textContent='Step 4 · Additional trip details';
      if(title)title.textContent='Return miles & optional costs';
      if(copy)copy.textContent='Enter only items that apply to this load. Advanced controls stay optional.';
    }
    const snapshot=$('v35-snapshot-count')?.closest('.panel');
    if(snapshot)snapshot.hidden=true;
  }

  function addAssumptionControls(){
    if($('v38-recurring-assumption-note'))return;
    const fuelSubhead=[...form.querySelectorAll('.subhead')].find(node=>/Fuel and trip costs/i.test(node.textContent||''));
    if(!fuelSubhead)return;

    const note=document.createElement('div');
    note.id='v38-recurring-assumption-note';
    note.className='notice field full';
    note.innerHTML='<strong>First-time operating assumptions</strong><br>Fuel price changes by load. Enter your actual MPG, maintenance reserve, tire reserve, recurring fixed-cost allowance, and desired profit once, then save them for future load decisions.<div class="form-actions" style="margin-top:10px"><button class="btn" id="v38-save-operating-assumptions" type="button">Save recurring assumptions</button></div>';
    fuelSubhead.insertAdjacentElement('afterend',note);

    $('v38-save-operating-assumptions')?.addEventListener('click',()=>{
      const mode=$('v35-mpg-mode')?.value||'blended';
      const needed=[
        ['v35-maintenance','Maintenance reserve / mile'],
        ['v35-tires','Tire reserve / mile'],
        ['v35-fixed-cpm','Insurance + fixed cost / mile'],
        ['v35-target-profit','Desired profit']
      ];
      if(mode==='blended')needed.unshift(['v35-mpg','Average MPG']);
      else needed.unshift(['v35-empty-mpg','Empty MPG'],['v35-loaded-mpg','Loaded MPG']);
      const missing=needed.find(([id])=>String($(id)?.value||'').trim()===''||!Number.isFinite(Number($(id)?.value)));
      if(missing){
        $(missing[0])?.focus();
        notify('Enter '+missing[1]+' before saving recurring assumptions.');
        return;
      }
      const saved={
        mpgMode:mode,
        averageMpg:mode==='blended'?Number($('v35-mpg').value):null,
        loadedMpg:mode==='separate'?Number($('v35-loaded-mpg').value):null,
        emptyMpg:mode==='separate'?Number($('v35-empty-mpg').value):null,
        maintenanceReserve:Number($('v35-maintenance').value),
        tireReserve:Number($('v35-tires').value),
        fixedCpm:Number($('v35-fixed-cpm').value),
        targetProfit:Number($('v35-target-profit').value),
        savedAt:new Date().toISOString()
      };
      localStorage.setItem(assumptionsKey,JSON.stringify(saved));
      notify('Recurring operating assumptions saved for future loads.');
    });
  }

  function addReturnDeadheadChoice(){
    const control=$('v35-return-deadhead');
    const field=control?.closest('.field');
    if(!control||!field||$('v38-no-return-deadhead'))return;

    control.placeholder='Enter expected return/repositioning miles';
    const choice=document.createElement('label');
    choice.className='checkbox-field';
    choice.style.marginTop='8px';
    choice.innerHTML='<input id="v38-no-return-deadhead" type="checkbox"> No expected return/repositioning miles';
    field.appendChild(choice);

    const checkbox=$('v38-no-return-deadhead');
    checkbox.addEventListener('change',()=>{
      if(checkbox.checked){
        control.value='0';
        control.readOnly=true;
      }else{
        if(control.value==='0')control.value='';
        control.readOnly=false;
      }
      control.dispatchEvent(new Event('input',{bubbles:true}));
    });
    if(control.value==='0'&&hasSavedEvaluation())checkbox.checked=true;
  }

  function markFirstTimeRequired(){
    [
      'v35-maintenance',
      'v35-tires',
      'v35-fixed-cpm',
      'v35-target-profit'
    ].forEach(id=>{
      const control=$(id);
      if(!control)return;
      control.dataset.v38Required='true';
      control.placeholder='Enter actual value';
    });
    if($('v35-fuel-price'))$('v35-fuel-price').placeholder='Current fuel price';
    if($('v35-mpg'))$('v35-mpg').placeholder='Your actual average MPG';
  }

  function installDecisionGuard(){
    document.addEventListener('submit',event=>{
      if(event.target!==form)return;

      const mode=$('v35-mpg-mode')?.value||'blended';
      const required=[
        ['v35-loaded-miles','Loaded miles'],
        ['v35-deadhead-miles','Deadhead-to-pickup miles'],
        ['v35-offer','Offered linehaul rate'],
        ['v35-cargo-weight','Cargo/load weight'],
        ['v35-fuel-price','Current fuel price'],
        ['v35-maintenance','Maintenance reserve'],
        ['v35-tires','Tire reserve'],
        ['v35-fixed-cpm','Insurance/fixed-cost allowance'],
        ['v35-target-profit','Desired profit']
      ];
      if(mode==='blended')required.push(['v35-mpg','Average MPG']);
      else required.push(['v35-loaded-mpg','Loaded MPG'],['v35-empty-mpg','Empty MPG']);

      const missing=required.find(([id])=>{
        const value=String($(id)?.value??'').trim();
        return value===''||!Number.isFinite(Number(value));
      });
      if(missing){
        event.preventDefault();
        event.stopImmediatePropagation();
        $(missing[0])?.focus();
        notify('Enter '+missing[1]+' before running the load decision.');
        return;
      }

      const returnControl=$('v35-return-deadhead');
      const noReturn=$('v38-no-return-deadhead');
      if(returnControl&&String(returnControl.value||'').trim()===''&&!noReturn?.checked){
        event.preventDefault();
        event.stopImmediatePropagation();
        returnControl.focus();
        notify('Enter return/repositioning miles, or select No expected return/repositioning miles.');
      }
    },true);
  }

  clearLegacyDefaults();
  restoreExistingEvaluation();
  applySavedAssumptions();
  reorderFirstTimeFlow();
  simplifyLegacyEconomicsPanel();
  addAssumptionControls();
  addReturnDeadheadChoice();
  markFirstTimeRequired();
  installDecisionGuard();

  window.FLTFirstLoadCleanup={
    assumptionsKey,
    clearLegacyDefaults,
    applySavedAssumptions,
    reorderFirstTimeFlow
  };
})();
