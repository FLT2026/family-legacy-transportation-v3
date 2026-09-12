(() => {
  'use strict';
  if(window.FLTCurrentRigDisplayHardfix)return;

  const fleetKey='flt-v35-fleet';
  const currentKey='flt-v38-current-working-rig';
  const regularRigKey='flt-v36-regular-rig';
  const legacyRigKey='flt-v35-default-fleet-selection';
  const plannedToVerifiedReason='Complete planned record with verified information';
  const formMap={
    driver:{formId:'fleet-driver-form',bucket:'drivers',identity:'name'},
    truck:{formId:'fleet-truck-form',bucket:'trucks',identity:'unit'},
    trailer:{formId:'fleet-trailer-form',bucket:'trailers',identity:'unit'}
  };

  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(error){return fallback}};
  const readFleet=()=>({...{drivers:[],trucks:[],trailers:[],locks:[],audit:[]},...readJson(fleetKey,{})});
  const readCurrent=()=>({...{driverId:'',truckId:'',trailerId:'',startedAt:''},...readJson(currentKey,{})});
  const writeCurrent=current=>localStorage.setItem(currentKey,JSON.stringify(current));
  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const notFuture=value=>{if(!value)return false;const date=new Date(String(value)+'T23:59:59');return Number.isFinite(date.getTime())&&date<=new Date()};
  const driverReady=record=>{if(record?.status!=='active'||!record.licenseState||!record.expiration)return false;const expiration=new Date(record.expiration+'T23:59:59');return Number.isFinite(expiration.getTime())&&expiration>=new Date()};
  const truckReady=record=>Boolean(record?.status==='active'&&validVin(record.vin)&&record.weightBasis==='scale-ticket'&&notFuture(record.verificationDate)&&Number(record.gvwr)>0&&Number(record.gcwr)>=Number(record.gvwr)&&Number(record.emptyWeight)>0&&Number(record.emptyWeight)<Number(record.gvwr)&&Number(record.frontGawr)>0&&Number(record.rearGawr)>0&&Number(record.frontGawr)+Number(record.rearGawr)>=Number(record.gvwr)&&Number(record.frontTireCapacity)>=Number(record.frontGawr)&&Number(record.rearTireCapacity)>=Number(record.rearGawr)&&Number(record.hitchCapacity)>0);
  const trailerReady=record=>Boolean(record?.status==='active'&&validVin(record.vin)&&record.weightBasis==='scale-ticket'&&notFuture(record.verificationDate)&&Number(record.gvwr)>0&&Number(record.emptyWeight)>0&&Number(record.emptyWeight)<Number(record.gvwr)&&Number(record.axleCapacity)>=Number(record.gvwr)&&Number(record.tireCapacity)>=Number(record.gvwr)&&Number(record.hitchCapacity)>=Number(record.gvwr));
  const readyFor={driver:driverReady,truck:truckReady,trailer:trailerReady};

  function readinessReason(kind,record){
    if(!record)return 'record missing';
    if(record.status==='cancelled')return 'record cancelled';
    if(record.status!=='active')return 'record is planned, not verified';
    if(kind==='driver'){
      if(!record.licenseState)return 'license state missing';
      if(!record.expiration)return 'license expiration missing';
      const expiration=new Date(record.expiration+'T23:59:59');
      if(!Number.isFinite(expiration.getTime())||expiration<new Date())return 'license expired';
      return 'driver verification incomplete';
    }
    if(!validVin(record.vin))return 'VIN verification incomplete';
    if(record.weightBasis!=='scale-ticket')return 'scale-ticket verification required';
    if(!notFuture(record.verificationDate))return 'ready-to-work scale date is missing or invalid';
    return 'equipment verification incomplete';
  }

  function recordFor(kind,id,fleet=readFleet()){
    const meta=formMap[kind];
    return id?(fleet[meta.bucket]||[]).find(item=>item.id===id)||null:null;
  }

  function invalidateStaleRigSelections(){
    const fleet=readFleet(),before=readCurrent(),after={...before},invalidated={...(before.invalidated||{})},reasons=[];
    let changed=false;
    for(const kind of Object.keys(formMap)){
      const id=before[kind+'Id'];
      if(!id)continue;
      const record=recordFor(kind,id,fleet);
      if(readyFor[kind](record))continue;
      const label=record?.name||record?.unit||kind;
      const reason=readinessReason(kind,record);
      invalidated[kind]={id,label,reason,at:new Date().toISOString()};
      after[kind+'Id']='';
      reasons.push(kind+': '+label+' - '+reason);
      changed=true;
    }
    if(changed){
      after.invalidated=invalidated;
      after.updatedAt=new Date().toISOString();
      writeCurrent(after);
      fleet.audit=fleet.audit||[];
      fleet.audit.push({action:'current_working_rig_invalidated',timestamp:after.updatedAt,reasons:[...reasons],reason:reasons.join('; '),before:{...before},after:{...after}});
      localStorage.setItem(fleetKey,JSON.stringify(fleet));
    }

    const regular=readJson(regularRigKey,readJson(legacyRigKey,{}))||{};
    const regularKinds=Object.keys(formMap).filter(kind=>regular[kind+'Id']);
    const invalidRegular=regularKinds.filter(kind=>!readyFor[kind](recordFor(kind,regular[kind+'Id'],fleet)));
    if(invalidRegular.length){
      localStorage.removeItem(regularRigKey);
      localStorage.removeItem(legacyRigKey);
      const freshFleet=readFleet();
      freshFleet.audit=freshFleet.audit||[];
      const timestamp=new Date().toISOString();
      const regularReasons=invalidRegular.map(kind=>{
        const record=recordFor(kind,regular[kind+'Id'],freshFleet);
        return kind+': '+(record?.name||record?.unit||kind)+' - '+readinessReason(kind,record);
      });
      freshFleet.audit.push({action:'regular_rig_invalidated',timestamp,reasons:regularReasons,reason:regularReasons.join('; '),before:{...regular},after:null});
      localStorage.setItem(fleetKey,JSON.stringify(freshFleet));
    }

    if(changed||invalidRegular.length){
      setTimeout(()=>window.dispatchEvent(new Event('flt:workflow-state-changed')),0);
    }
  }

  function fillForm(form,record){
    if(!form||!record)return;
    Object.entries(record).forEach(([name,value])=>{
      const control=form.elements?.[name];
      if(!control||name==='id')return;
      control.value=value??'';
      control.dispatchEvent(new Event('change',{bubbles:true}));
    });
    form.dataset.currentRecordId=record.id||'';
    const button=form.querySelector('button[type="submit"],button:not([type])');
    if(button)button.textContent='Saved · Current '+(form.id.includes('driver')?'driver':form.id.includes('truck')?'truck':'trailer');
  }

  function kindForForm(form){return Object.keys(formMap).find(kind=>formMap[kind].formId===form?.id)||''}
  function currentRecord(kind){
    const meta=formMap[kind],fleet=readFleet(),current=readCurrent();
    const id=current[kind+'Id'];
    if(id)return (fleet[meta.bucket]||[]).find(item=>item.id===id&&item.status!=='cancelled')||null;
    return null;
  }

  function prepareCurrentVerification(event){
    const form=event.target,kind=kindForForm(form);
    if(!kind||!form.dataset.currentRecordId||form.dataset.editId)return;
    const record=currentRecord(kind);
    if(!record||record.id!==form.dataset.currentRecordId)return;
    if(record.status==='planned'&&form.elements?.status?.value==='active'){
      form.dataset.editId=record.id;
      form.dataset.editReason=plannedToVerifiedReason;
      const button=form.querySelector('button[type="submit"],button:not([type])');
      if(button)button.textContent='Verify current '+kind;
    }
  }
  document.addEventListener('submit',prepareCurrentVerification,true);

  function restoreKind(kind){
    const meta=formMap[kind],form=document.getElementById(meta.formId),record=currentRecord(kind);
    if(form&&record)fillForm(form,record);
  }

  function restoreAll(){Object.keys(formMap).forEach(restoreKind)}

  function captureSubmit(kind){
    const meta=formMap[kind],form=document.getElementById(meta.formId);
    if(!form||form.dataset.fltCurrentRigHook==='1')return;
    form.dataset.fltCurrentRigHook='1';
    form.addEventListener('submit',()=>{
      const before=readFleet()[meta.bucket]||[];
      const identity=String(form.elements?.[meta.identity]?.value||'').trim();
      const beforeIds=new Set(before.map(item=>item.id));
      const expectedId=form.dataset.editId||form.dataset.currentRecordId||'';
      setTimeout(()=>{
        const after=readFleet()[meta.bucket]||[];
        let saved=expectedId?after.find(item=>item.id===expectedId):null;
        if(!saved)saved=after.find(item=>!beforeIds.has(item.id)&&String(item?.[meta.identity]||'').trim()===identity);
        if(!saved)saved=[...after].reverse().find(item=>String(item?.[meta.identity]||'').trim()===identity&&item.status!=='cancelled');
        if(!saved)return;
        const current=readCurrent();
        current[kind+'Id']=saved.id;
        if(current.invalidated)delete current.invalidated[kind];
        if(!current.startedAt)current.startedAt=new Date().toISOString();
        current.updatedAt=new Date().toISOString();
        writeCurrent(current);
        invalidateStaleRigSelections();
        fillForm(form,saved);
        renderSummary();
      },350);
    },true);
  }

  function mountCurrentSummary(){
    const fleet=document.getElementById('fleet');
    if(!fleet||document.getElementById('v38-current-working-rig'))return;
    const firstGrid=fleet.querySelector('.grid.three');
    if(!firstGrid)return;
    const panel=document.createElement('div');
    panel.id='v38-current-working-rig';panel.className='panel';panel.style.marginBottom='14px';
    panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Current working rig</div><h2>Stays active only while every record remains ready</h2><p class="subtle" style="margin-top:5px">Expired or incomplete driver, truck, or trailer records are removed from the active rig and must be verified again before dispatch.</p></div><span class="tag" id="v38-current-rig-status">CURRENT</span></div><div class="grid three" style="margin-top:12px"><div><strong>Driver</strong><div id="v38-current-driver" class="subtle">Not selected</div></div><div><strong>Truck</strong><div id="v38-current-truck" class="subtle">Not selected</div></div><div><strong>Trailer</strong><div id="v38-current-trailer" class="subtle">Not selected</div></div></div>';
    firstGrid.parentNode.insertBefore(panel,firstGrid);
  }

  function renderSummary(){
    const fleet=readFleet(),current=readCurrent();
    const lookup=(kind,id,label)=>{
      const meta=formMap[kind],item=(fleet[meta.bucket]||[]).find(x=>x.id===id&&x.status!=='cancelled');
      if(item)return (item.name||item.unit||label)+' · '+(readyFor[kind](item)?'Active / Verified':readinessReason(kind,item).toUpperCase());
      const stale=current.invalidated?.[kind];
      return stale?(stale.label||label)+' · NOT READY - '+stale.reason:'Not selected';
    };
    const driver=document.getElementById('v38-current-driver'),truck=document.getElementById('v38-current-truck'),trailer=document.getElementById('v38-current-trailer');
    if(driver)driver.textContent=lookup('driver',current.driverId,'Driver');
    if(truck)truck.textContent=lookup('truck',current.truckId,'Truck');
    if(trailer)trailer.textContent=lookup('trailer',current.trailerId,'Trailer');
    const ready=Object.keys(formMap).every(kind=>readyFor[kind](recordFor(kind,current[kind+'Id'],fleet)));
    const status=document.getElementById('v38-current-rig-status');
    if(status){status.textContent=ready?'CURRENT':'ACTION REQUIRED';status.className='tag '+(ready?'':'orange')}
  }

  function apply(){
    invalidateStaleRigSelections();
    mountCurrentSummary();
    Object.keys(formMap).forEach(captureSubmit);
    restoreAll();renderSummary();
  }

  document.getElementById('nav')?.addEventListener('click',event=>{
    if(event.target.closest('[data-view="fleet"]'))setTimeout(()=>{invalidateStaleRigSelections();restoreAll();renderSummary()},80);
  },true);
  window.addEventListener('flt:modules-loaded',()=>setTimeout(apply,0));
  window.addEventListener('storage',event=>{if([fleetKey,currentKey,regularRigKey,legacyRigKey].includes(event.key)){invalidateStaleRigSelections();restoreAll();renderSummary()}});
  apply();
  window.FLTCurrentRigDisplayHardfix={restoreAll,renderSummary,readCurrent,currentKey,invalidateStaleRigSelections,driverReady,truckReady,trailerReady};
})();
