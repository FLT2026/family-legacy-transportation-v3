(() => {
  'use strict';
  if(window.FLTCurrentRigDisplayHardfix)return;

  const fleetKey='flt-v35-fleet';
  const currentKey='flt-v38-current-working-rig';
  const formMap={
    driver:{formId:'fleet-driver-form',bucket:'drivers',identity:'name'},
    truck:{formId:'fleet-truck-form',bucket:'trucks',identity:'unit'},
    trailer:{formId:'fleet-trailer-form',bucket:'trailers',identity:'unit'}
  };

  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(error){return fallback}};
  const readFleet=()=>({...{drivers:[],trucks:[],trailers:[],locks:[],audit:[]},...readJson(fleetKey,{})});
  const readCurrent=()=>({...{driverId:'',truckId:'',trailerId:'',startedAt:''},...readJson(currentKey,{})});
  const writeCurrent=current=>localStorage.setItem(currentKey,JSON.stringify(current));

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

  function currentRecord(kind){
    const meta=formMap[kind],fleet=readFleet(),current=readCurrent();
    const id=current[kind+'Id'];
    if(id)return (fleet[meta.bucket]||[]).find(item=>item.id===id&&item.status!=='cancelled')||null;
    return null;
  }

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
      setTimeout(()=>{
        const after=readFleet()[meta.bucket]||[];
        let saved=after.find(item=>!beforeIds.has(item.id)&&String(item?.[meta.identity]||'').trim()===identity);
        if(!saved&&form.dataset.editId)saved=after.find(item=>item.id===form.dataset.editId);
        if(!saved)saved=[...after].reverse().find(item=>String(item?.[meta.identity]||'').trim()===identity&&item.status!=='cancelled');
        if(!saved)return;
        const current=readCurrent();
        current[kind+'Id']=saved.id;
        if(!current.startedAt)current.startedAt=new Date().toISOString();
        current.updatedAt=new Date().toISOString();
        writeCurrent(current);
        fillForm(form,saved);
      },80);
    },true);
  }

  function mountCurrentSummary(){
    const fleet=document.getElementById('fleet');
    if(!fleet||document.getElementById('v38-current-working-rig'))return;
    const firstGrid=fleet.querySelector('.grid.three');
    if(!firstGrid)return;
    const panel=document.createElement('div');
    panel.id='v38-current-working-rig';panel.className='panel';panel.style.marginBottom='14px';
    panel.innerHTML='<div class="section-head"><div><div class="eyebrow">Current working rig</div><h2>Stays active until you intentionally change it</h2><p class="subtle" style="margin-top:5px">Saved driver, truck, and trailer information remains visible and reusable while this rig is in service.</p></div><span class="tag" id="v38-current-rig-status">CURRENT</span></div><div class="grid three" style="margin-top:12px"><div><strong>Driver</strong><div id="v38-current-driver" class="subtle">Not selected</div></div><div><strong>Truck</strong><div id="v38-current-truck" class="subtle">Not selected</div></div><div><strong>Trailer</strong><div id="v38-current-trailer" class="subtle">Not selected</div></div></div>';
    firstGrid.parentNode.insertBefore(panel,firstGrid);
  }

  function renderSummary(){
    const fleet=readFleet(),current=readCurrent();
    const lookup=(bucket,id,label)=>{
      const item=(fleet[bucket]||[]).find(x=>x.id===id&&x.status!=='cancelled');
      return item?(item.name||item.unit||label)+' · '+(item.status==='active'?'Active / Verified':'Planned'):'Not selected';
    };
    const driver=document.getElementById('v38-current-driver'),truck=document.getElementById('v38-current-truck'),trailer=document.getElementById('v38-current-trailer');
    if(driver)driver.textContent=lookup('drivers',current.driverId,'Driver');
    if(truck)truck.textContent=lookup('trucks',current.truckId,'Truck');
    if(trailer)trailer.textContent=lookup('trailers',current.trailerId,'Trailer');
  }

  function apply(){
    mountCurrentSummary();
    Object.keys(formMap).forEach(captureSubmit);
    restoreAll();renderSummary();
  }

  document.getElementById('nav')?.addEventListener('click',event=>{
    if(event.target.closest('[data-view="fleet"]'))setTimeout(()=>{restoreAll();renderSummary()},80);
  },true);
  window.addEventListener('flt:modules-loaded',()=>setTimeout(apply,0));
  window.addEventListener('storage',event=>{if([fleetKey,currentKey].includes(event.key)){restoreAll();renderSummary()}});
  apply();
  window.FLTCurrentRigDisplayHardfix={restoreAll,renderSummary,readCurrent,currentKey};
})();
