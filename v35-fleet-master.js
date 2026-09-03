(() => {
  const fleet=document.getElementById('fleet');
  if(!fleet||document.getElementById('v35-fleet-master-manager'))return;
  const key='flt-v35-fleet',read=()=>{try{return {...{drivers:[],trucks:[],trailers:[],locks:[],audit:[]},...JSON.parse(localStorage.getItem(key)||'{}')}}catch(error){return{drivers:[],trucks:[],trailers:[],locks:[],audit:[]}}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const numeric=['gvwr','gcwr','emptyWeight','frontGawr','rearGawr','frontTireCapacity','rearTireCapacity','tireCapacity','hitchCapacity','axleCapacity','manufacturerPayload','frontColdPsi','rearColdPsi'];
  const truckFields=`
    <div class="field"><label>Year</label><input name="year" inputmode="numeric" placeholder="2016"></div>
    <div class="field"><label>Make / Model</label><input name="makeModel" placeholder="Ford F-250"></div>
    <div class="field"><label>Front GAWR (lb) <span class="subtle">(Active)</span></label><input name="frontGawr" type="number" min="1"></div>
    <div class="field"><label>Rear GAWR (lb) <span class="subtle">(Active)</span></label><input name="rearGawr" type="number" min="1"></div>
    <div class="field"><label>Manufacturer payload label (lb)</label><input name="manufacturerPayload" type="number" min="1" placeholder="Reference only"></div>
    <div class="field"><label>Front tire size</label><input name="frontTireSize" placeholder="LT245/75R17E 121/118S"></div>
    <div class="field"><label>Rear tire size</label><input name="rearTireSize" placeholder="LT245/75R17E 121/118S"></div>
    <div class="field"><label>Front cold pressure (PSI)</label><input name="frontColdPsi" type="number" min="1"></div>
    <div class="field"><label>Rear cold pressure (PSI)</label><input name="rearColdPsi" type="number" min="1"></div>
    <div class="field"><label>Front-axle tire capacity (lb) <span class="subtle">(Active)</span></label><input name="frontTireCapacity" type="number" min="1"></div>
    <div class="field"><label>Rear-axle tire capacity (lb) <span class="subtle">(Active)</span></label><input name="rearTireCapacity" type="number" min="1"></div>
    <div class="field"><label>Hitch rating (lb) <span class="subtle">(Active)</span></label><input name="hitchCapacity" type="number" min="1"></div>
    <div class="field"><label>Ready-to-work scale date <span class="subtle">(Active)</span></label><input name="verificationDate" type="date"></div>
    <div class="field"><label>Weight verification</label><select name="weightBasis"><option value="planned">Planned / estimate</option><option value="scale-ticket">Scale ticket · full fuel and normal equipment</option><option value="manufacturer">Manufacturer document</option></select></div>`;
  const trailerFields=`
    <div class="field"><label>Year</label><input name="year" inputmode="numeric"></div>
    <div class="field"><label>Make / Model</label><input name="makeModel"></div>
    <div class="field"><label>Combined axle rating (lb) <span class="subtle">(Active)</span></label><input name="axleCapacity" type="number" min="1"></div>
    <div class="field"><label>Combined tire capacity (lb) <span class="subtle">(Active)</span></label><input name="tireCapacity" type="number" min="1"></div>
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
    const names=kind==='truck'?['vin','gvwr','gcwr','emptyWeight','frontGawr','rearGawr','frontTireCapacity','rearTireCapacity','hitchCapacity','verificationDate']:kind==='trailer'?['vin','gvwr','emptyWeight','axleCapacity','tireCapacity','hitchCapacity','verificationDate']:['licenseState','expiration'];
    form.noValidate=true;
    names.forEach(name=>{if(form.elements[name]){form.elements[name].required=false;form.elements[name].setAttribute('aria-required',active?'true':'false')}});
  }
  [['driver',document.getElementById('fleet-driver-form')],['truck',truckForm],['trailer',trailerForm]].forEach(([kind,form])=>{
    form.elements.status?.addEventListener('change',()=>setActiveRequirements(form,kind));setActiveRequirements(form,kind);
  });

  const editForms=[['driver','drivers',document.getElementById('fleet-driver-form')],['truck','trucks',truckForm],['trailer','trailers',trailerForm]];
  function clearEditState(restore=true,clearReason=true){
    const data=read();
    editForms.forEach(([kind,bucket,form])=>{
      if(restore&&form.dataset.editId){
        const saved=(data[bucket]||[]).find(item=>item.id===form.dataset.editId);
        form.reset();
        if(saved)Object.entries(saved).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??''});
        setActiveRequirements(form,kind);
      }
      delete form.dataset.editId;delete form.dataset.editReason;
      form.querySelector('button[type="submit"],button:not([type])').textContent='Save '+kind;
      form.querySelectorAll('.field-error-control,.guided-current-control').forEach(control=>control.classList.remove('field-error-control','guided-current-control'));
    });
    document.getElementById('v35-master-cancel').hidden=true;
    if(clearReason)reason.value='';
  }
  function cancelEdit(){
    clearEditState(true,true);notice.textContent='Edit cancelled. No saved record was changed.';
  }
  document.getElementById('v35-master-cancel').addEventListener('click',cancelEdit);
  document.getElementById('v35-master-edit').addEventListener('click',()=>{
    const data=read(),bucket=type.value,record=(data[bucket]||[]).find(x=>x.id===recordSelect.value);
    if(!record){notice.innerHTML='<strong>Select a saved record first.</strong>';recordSelect.focus();return}
    if(!reason.value.trim()){notice.innerHTML='<strong>Enter the authorized change reason first.</strong>';reason.focus();return}
    const authorizedReason=reason.value.trim();
    clearEditState(true,false);
    const kind=bucketLabel[bucket],form=document.getElementById('fleet-'+kind+'-form');
    Object.entries(record).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??''});
    form.dataset.editId=record.id;form.dataset.editReason=authorizedReason;setActiveRequirements(form,kind);
    form.querySelector('button[type="submit"],button:not([type])').textContent='Update '+kind;
    document.getElementById('v35-master-cancel').hidden=false;
    notice.innerHTML='<strong>Editing '+esc(record.name||record.unit)+'.</strong><br>Review every highlighted Active / Verified field, then press Update '+kind+'.';
    form.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input,select')?.focus();
  });

  function validateActive(form,kind){
    if(form.elements.status?.value!=='active')return null;
    const names=kind==='truck'?['vin','gvwr','gcwr','emptyWeight','frontGawr','rearGawr','frontTireCapacity','rearTireCapacity','hitchCapacity','verificationDate']:kind==='trailer'?['vin','gvwr','emptyWeight','axleCapacity','tireCapacity','hitchCapacity','verificationDate']:['licenseState','expiration'];
    const missing=names.find(name=>!String(form.elements[name]?.value||'').trim());
    if(missing)return{control:form.elements[missing],message:'Complete the highlighted Active / Verified field.'};
    const fail=(name,message)=>({control:form.elements[name],message}),n=name=>Number(form.elements[name]?.value),validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim()),validScaleDate=value=>{const date=new Date(String(value||'')+'T00:00:00'),today=new Date();today.setHours(0,0,0,0);return Number.isFinite(date.getTime())&&date<=today};
    if(kind==='driver'){
      if(!/^[A-Za-z]{2}$/.test(String(form.elements.licenseState.value).trim()))return fail('licenseState','Enter the 2-letter license state.');
      const expiration=new Date(form.elements.expiration.value+'T23:59:59');
      if(!Number.isFinite(expiration.getTime())||expiration<new Date())return fail('expiration','The driver license expiration must be current.');
    }
    if(kind==='truck'){
      if(!validVin(form.elements.vin.value))return fail('vin','Enter the complete 17-character truck VIN. Letters I, O, and Q are not used.');
      if(form.elements.weightBasis.value!=='scale-ticket')return fail('weightBasis','Active / Verified requires a ready-to-work scale ticket.');
      if(!validScaleDate(form.elements.verificationDate.value))return fail('verificationDate','Enter a valid truck scale date that is not in the future.');
      if(n('emptyWeight')>=n('gvwr'))return fail('emptyWeight','Truck ready-to-work empty weight must be below truck GVWR.');
      if(n('gvwr')>n('gcwr'))return fail('gcwr','Truck GCWR cannot be lower than truck GVWR.');
      if(n('frontGawr')+n('rearGawr')<n('gvwr'))return fail('rearGawr','Combined front and rear GAWR must cover truck GVWR.');
      if(n('frontTireCapacity')<n('frontGawr'))return fail('frontTireCapacity','Front-axle tire capacity must cover front GAWR.');
      if(n('rearTireCapacity')<n('rearGawr'))return fail('rearTireCapacity','Rear-axle tire capacity must cover rear GAWR.');
    }
    if(kind==='trailer'){
      if(!validVin(form.elements.vin.value))return fail('vin','Enter the complete 17-character trailer VIN. Letters I, O, and Q are not used.');
      if(form.elements.weightBasis.value!=='scale-ticket')return fail('weightBasis','Active / Verified requires a ready-to-work scale ticket.');
      if(!validScaleDate(form.elements.verificationDate.value))return fail('verificationDate','Enter a valid trailer scale date that is not in the future.');
      if(n('emptyWeight')>=n('gvwr'))return fail('emptyWeight','Trailer ready-to-work empty weight must be below trailer GVWR.');
      if(n('axleCapacity')<n('gvwr'))return fail('axleCapacity','Combined trailer axle rating must cover trailer GVWR.');
      if(n('tireCapacity')<n('gvwr'))return fail('tireCapacity','Combined trailer tire capacity must cover trailer GVWR.');
      if(n('hitchCapacity')<n('gvwr'))return fail('hitchCapacity','Hitch / coupler rating must cover trailer GVWR.');
    }
    return null;
  }
  [['driver','drivers'],['truck','trucks'],['trailer','trailers']].forEach(([kind,bucket])=>{
    const form=document.getElementById('fleet-'+kind+'-form');
    form.addEventListener('submit',()=>setTimeout(refreshRecords,0));
    form.addEventListener('submit',event=>{
      const problem=validateActive(form,kind);
      if(problem){event.preventDefault();event.stopImmediatePropagation();problem.control.classList.add('field-error-control','guided-current-control');problem.control.scrollIntoView({behavior:'smooth',block:'center'});problem.control.focus();if(typeof toast==='function')toast(problem.message);return}
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
