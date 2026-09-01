(() => {
  const fleet=document.getElementById('fleet');
  if(!fleet||document.getElementById('v35-fleet-master-manager'))return;
  const key='flt-v35-fleet',read=()=>{try{return {...{drivers:[],trucks:[],trailers:[],locks:[],audit:[]},...JSON.parse(localStorage.getItem(key)||'{}')}}catch(error){return{drivers:[],trucks:[],trailers:[],locks:[],audit:[]}}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const numeric=['gvwr','gcwr','emptyWeight','frontGawr','rearGawr','tireCapacity','hitchCapacity','axleCapacity'];
  const truckFields=`
    <div class="field"><label>Year</label><input name="year" inputmode="numeric" placeholder="2016"></div>
    <div class="field"><label>Make / Model</label><input name="makeModel" placeholder="Ford F-250"></div>
    <div class="field"><label>Front GAWR (lb) <span class="subtle">(Active)</span></label><input name="frontGawr" type="number" min="1"></div>
    <div class="field"><label>Rear GAWR (lb) <span class="subtle">(Active)</span></label><input name="rearGawr" type="number" min="1"></div>
    <div class="field"><label>Lowest tire capacity (lb) <span class="subtle">(Active)</span></label><input name="tireCapacity" type="number" min="1"></div>
    <div class="field"><label>Hitch rating (lb) <span class="subtle">(Active)</span></label><input name="hitchCapacity" type="number" min="1"></div>
    <div class="field"><label>Ready-to-work scale date <span class="subtle">(Active)</span></label><input name="verificationDate" type="date"></div>
    <div class="field"><label>Weight verification</label><select name="weightBasis"><option value="planned">Planned / estimate</option><option value="scale-ticket">Scale ticket · full fuel and normal equipment</option><option value="manufacturer">Manufacturer document</option></select></div>`;
  const trailerFields=`
    <div class="field"><label>Year</label><input name="year" inputmode="numeric"></div>
    <div class="field"><label>Make / Model</label><input name="makeModel"></div>
    <div class="field"><label>Combined axle rating (lb) <span class="subtle">(Active)</span></label><input name="axleCapacity" type="number" min="1"></div>
    <div class="field"><label>Lowest tire capacity (lb) <span class="subtle">(Active)</span></label><input name="tireCapacity" type="number" min="1"></div>
    <div class="field"><label>Hitch / coupler rating (lb) <span class="subtle">(Active)</span></label><input name="hitchCapacity" type="number" min="1"></div>
    <div class="field"><label>Ready-to-work scale date <span class="subtle">(Active)</span></label><input name="verificationDate" type="date"></div>
    <div class="field full"><label>Weight verification</label><select name="weightBasis"><option value="planned">Planned / estimate</option><option value="scale-ticket">Scale ticket · normal equipment included</option><option value="manufacturer">Manufacturer document</option></select></div>`;
  const truckForm=document.getElementById('fleet-truck-form'),trailerForm=document.getElementById('fleet-trailer-form');
  truckForm.querySelector('.form-actions').insertAdjacentHTML('beforebegin',truckFields);
  trailerForm.querySelector('.form-actions').insertAdjacentHTML('beforebegin',trailerFields);

  const firstGrid=fleet.querySelector('.grid.three');
  const manager=document.createElement('div');manager.id='v35-fleet-master-manager';manager.className='panel';manager.style.marginTop='14px';
  manager.innerHTML=`<div class="section-head"><div><div class="eyebrow">Enter once · controlled changes</div><h2>Edit Saved Master Records</h2><p class="subtle" style="margin-top:5px">Choose an existing record, state why it is changing, then update it. Completed-load snapshots remain unchanged.</p></div><span class="tag">AUDITED</span></div>
    <div class="form-grid" style="margin-top:14px">
      <div class="field"><label>Record type</label><select id="v35-master-type"><option value="drivers">Driver</option><option value="trucks">Truck</option><option value="trailers">Trailer</option></select></div>
      <div class="field"><label>Saved record</label><select id="v35-master-record"></select></div>
      <div class="field full"><label>Authorized change reason</label><input id="v35-master-reason" placeholder="Example: Verified scale ticket and manufacturer ratings"></div>
      <div class="form-actions field full"><button class="btn primary" id="v35-master-edit" type="button">Load Record for Editing</button><button class="btn" id="v35-master-cancel" type="button" hidden>Cancel Edit</button></div>
    </div>
    <div class="notice" id="v35-master-notice" style="margin-bottom:0">Planned records may be completed here after the actual ratings and ready-to-work scale weight are verified.</div>`;
  firstGrid.insertAdjacentElement('afterend',manager);

  const type=document.getElementById('v35-master-type'),recordSelect=document.getElementById('v35-master-record'),reason=document.getElementById('v35-master-reason'),notice=document.getElementById('v35-master-notice');
  const bucketLabel={drivers:'driver',trucks:'truck',trailers:'trailer'};
  function refreshRecords(){
    const data=read(),items=data[type.value]||[];
    recordSelect.innerHTML='<option value="">Select saved '+bucketLabel[type.value]+'</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||x.unit)+' · '+(x.status==='active'?'Active / Verified':'Planned')+'</option>').join('');
  }
  type.addEventListener('change',refreshRecords);refreshRecords();

  function setActiveRequirements(form,kind){
    const active=form.elements.status?.value==='active';
    const names=kind==='truck'?['vin','gvwr','gcwr','emptyWeight','frontGawr','rearGawr','tireCapacity','hitchCapacity','verificationDate']:kind==='trailer'?['vin','gvwr','emptyWeight','axleCapacity','tireCapacity','hitchCapacity','verificationDate']:['licenseState','expiration'];
    names.forEach(name=>{if(form.elements[name])form.elements[name].required=active});
  }
  [['driver',document.getElementById('fleet-driver-form')],['truck',truckForm],['trailer',trailerForm]].forEach(([kind,form])=>{
    form.elements.status?.addEventListener('change',()=>setActiveRequirements(form,kind));setActiveRequirements(form,kind);
  });

  function cancelEdit(){
    ['fleet-driver-form','fleet-truck-form','fleet-trailer-form'].forEach(id=>{const form=document.getElementById(id);delete form.dataset.editId;form.querySelector('button[type="submit"],button:not([type])').textContent='Save '+id.split('-')[1]});
    document.getElementById('v35-master-cancel').hidden=true;reason.value='';notice.textContent='Edit cancelled. No saved record was changed.';
  }
  document.getElementById('v35-master-cancel').addEventListener('click',cancelEdit);
  document.getElementById('v35-master-edit').addEventListener('click',()=>{
    const data=read(),bucket=type.value,record=(data[bucket]||[]).find(x=>x.id===recordSelect.value);
    if(!record){notice.innerHTML='<strong>Select a saved record first.</strong>';recordSelect.focus();return}
    if(!reason.value.trim()){notice.innerHTML='<strong>Enter the authorized change reason first.</strong>';reason.focus();return}
    const kind=bucketLabel[bucket],form=document.getElementById('fleet-'+kind+'-form');
    Object.entries(record).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??''});
    form.dataset.editId=record.id;form.dataset.editReason=reason.value.trim();setActiveRequirements(form,kind);
    form.querySelector('button[type="submit"],button:not([type])').textContent='Update '+kind;
    document.getElementById('v35-master-cancel').hidden=false;
    notice.innerHTML='<strong>Editing '+esc(record.name||record.unit)+'.</strong><br>Review every highlighted Active / Verified field, then press Update '+kind+'.';
    form.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input,select')?.focus();
  });

  function validateActive(form,kind){
    if(form.elements.status?.value!=='active')return null;
    const names=kind==='truck'?['vin','gvwr','gcwr','emptyWeight','frontGawr','rearGawr','tireCapacity','hitchCapacity','verificationDate']:kind==='trailer'?['vin','gvwr','emptyWeight','axleCapacity','tireCapacity','hitchCapacity','verificationDate']:['licenseState','expiration'];
    const missing=names.find(name=>!String(form.elements[name]?.value||'').trim());
    if(missing)return form.elements[missing];
    return null;
  }
  [['driver','drivers'],['truck','trucks'],['trailer','trailers']].forEach(([kind,bucket])=>{
    const form=document.getElementById('fleet-'+kind+'-form');
    form.addEventListener('submit',event=>{
      const missing=validateActive(form,kind);
      if(missing){event.preventDefault();event.stopImmediatePropagation();missing.classList.add('field-error-control','guided-current-control');missing.scrollIntoView({behavior:'smooth',block:'center'});missing.focus();if(typeof toast==='function')toast('Complete the highlighted Active / Verified field.');return}
      if(!form.dataset.editId)return;
      event.preventDefault();event.stopImmediatePropagation();
      const data=read(),index=(data[bucket]||[]).findIndex(x=>x.id===form.dataset.editId);
      if(index<0){if(typeof toast==='function')toast('Saved record could not be found.');return}
      const before={...data[bucket][index]},updated=Object.fromEntries(new FormData(form).entries());
      numeric.forEach(name=>{if(name in updated)updated[name]=String(updated[name]).trim()===''?null:Number(updated[name])});
      updated.id=before.id;updated.createdAt=before.createdAt||before.savedAt||new Date().toISOString();updated.updatedAt=new Date().toISOString();
      data[bucket][index]=updated;data.audit=data.audit||[];data.audit.push({action:'authorized_record_update',entityId:updated.id,entityType:kind,timestamp:updated.updatedAt,reason:form.dataset.editReason,reasons:[form.dataset.editReason],before,after:{...updated}});
      localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('flt-v35-resume-view','fleet');
      if(typeof toast==='function')toast((updated.name||updated.unit)+' updated with an audit record.');
      setTimeout(()=>location.reload(),250);
    },true);
  });
  if(localStorage.getItem('flt-v35-resume-view')==='fleet'){
    localStorage.removeItem('flt-v35-resume-view');setTimeout(()=>document.querySelector('#nav [data-view="fleet"]')?.click(),100);
  }
})();