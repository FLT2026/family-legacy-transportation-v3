(() => {
  const fleet=document.getElementById('fleet');
  if(!fleet||document.getElementById('v35-fleet-master-manager'))return;
  const key='flt-v35-fleet',read=()=>{try{return {...{drivers:[],trucks:[],trailers:[],locks:[],audit:[]},...JSON.parse(localStorage.getItem(key)||'{}')}}catch(error){return{drivers:[],trucks:[],trailers:[],locks:[],audit:[]}}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const numeric=['gvwr','gcwr','emptyWeight','frontGawr','rearGawr','frontTireCapacity','rearTireCapacity','tireCapacity','hitchCapacity','axleCapacity','manufacturerPayload','frontColdPsi','rearColdPsi'];
  const vehicleCatalog={
    truck:{Ford:['F-250','F-350','F-450','F-550','F-650','F-750'],Ram:['2500','3500','4500','5500'],Chevrolet:['Silverado 2500HD','Silverado 3500HD','Silverado 4500HD','Silverado 5500HD','Silverado 6500HD'],GMC:['Sierra 2500HD','Sierra 3500HD'],Freightliner:['M2','Cascadia'],International:['CV','MV','HX','LT'],Kenworth:['T280','T380','T480','T680','W900'],Peterbilt:['536','537','548','579','589'],Volvo:['VNL','VNR'],Mack:['MD','Anthem','Pinnacle']},
    trailer:{'Big Tex':['14GN','14LP','22GN','25GN'],'Diamond C':['FMAX210','FMAX212','FMAX216','LPX','LPT'],PJ:['CC','CE','FD','LD','LS'],'MAXX-D':['LHX','YDX','D9X','T8X','T6X'],'Load Trail':['CH','DL','GN'],Lamar:['DK','DS','CD','CC'],'Sure-Trac':[],'Iron Bull':['DTB','DTG','ETB','FHG'],Kaufman:[],Gatormade:[],'Texas Pride':[],'Carry-On':[],'H&H':[],Featherlite:['1610','3110','3150'],Haulmark:[],LOOK:[],'Wells Cargo':[],'Pace American':[],'Cargo Express':[],'Continental Cargo':[],Aluma:['7816','8218','8220'],Utility:['3000R','4000D-X'],'Great Dane':['Champion','Everest'],Wabash:['DuraPlate','Refrigerated']}
  };
  const trailerTypes={
    Gatormade:['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Utility'],
    'Texas Pride':['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Deckover'],
    'Big Tex':['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Utility'],
    'Diamond C':['Gooseneck / hotshot','Equipment / flatbed','Dump','Deckover'],
    PJ:['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Utility'],
    'MAXX-D':['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Deckover'],
    'Load Trail':['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Utility'],
    Lamar:['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Dump','Utility'],
    'Iron Bull':['Gooseneck / hotshot','Equipment / flatbed','Dump','Deckover'],
    Kaufman:['Gooseneck / hotshot','Equipment / flatbed','Car hauler','Enclosed','Deckover'],
    'Sure-Trac':['Equipment / flatbed','Car hauler','Dump','Enclosed','Utility'],
    'H&H':['Equipment / flatbed','Car hauler','Dump','Enclosed','Utility'],
    Featherlite:['Car hauler','Equipment / flatbed','Enclosed','Livestock'],
    Aluma:['Car hauler','Equipment / flatbed','Utility'],
    'Carry-On':['Utility','Car hauler','Equipment / flatbed','Enclosed'],
    Haulmark:['Enclosed','Car hauler'],LOOK:['Enclosed','Car hauler'],
    'Wells Cargo':['Enclosed','Car hauler'],'Pace American':['Enclosed','Car hauler'],
    'Cargo Express':['Enclosed','Car hauler'],'Continental Cargo':['Enclosed','Car hauler'],
    Utility:['Dry van','Refrigerated','Equipment / flatbed'],'Great Dane':['Dry van','Refrigerated','Equipment / flatbed'],Wabash:['Dry van','Refrigerated','Equipment / flatbed']
  };
  const trailerConfigurations={
    'Gooseneck / hotshot':['Low-profile hotshot gooseneck','Dual-wheel gooseneck','Tandem-axle gooseneck','Triple-axle gooseneck','Gooseneck with hydraulic dovetail','Gooseneck with full-width ramps'],
    'Equipment / flatbed':['Tandem-axle equipment trailer','Triple-axle equipment trailer','Tilt-deck equipment trailer','Equipment trailer with hydraulic dovetail','Flatbed with stand-up ramps','Flatbed with full-width ramps'],
    'Car hauler':['Open single-car hauler','Open multi-car hauler','Gooseneck car hauler','Enclosed car hauler','Tilt-deck car hauler'],
    Dump:['Bumper-pull dump','Gooseneck dump','Tandem-axle dump','Triple-axle dump','Roll-off dump'],
    Deckover:['Tandem-axle deckover','Dual-wheel deckover','Hydraulic tilt deckover','Deckover with dovetail and ramps'],
    Enclosed:['Enclosed cargo with rear ramp','Enclosed cargo with barn doors','Enclosed car / race trailer','Enclosed gooseneck'],
    Utility:['Single-axle utility','Tandem-axle utility','Landscape utility with ramp gate','Aluminum utility'],
    Livestock:['Bumper-pull livestock','Gooseneck livestock'],
    'Dry van':['Dry van - tandem axle','Dry van - custom length'],Refrigerated:['Refrigerated van - tandem axle','Refrigerated van - custom configuration']
  };
  const states={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
  const driverChoices={
    endorsements:{None:'None',T:'T - Double/Triple Trailers',P:'P - Passenger',N:'N - Tank Vehicle',H:'H - Hazardous Materials',X:'X - Tank + Hazmat',S:'S - School Bus',Other:'Other / State-specific'},
    restrictions:{None:'None',E:'E - No manual transmission CMV',L:'L - No air brake equipped CMV',Z:'Z - No full air brake equipped CMV',O:'O - No tractor-trailer CMV',M:'M - No Class A passenger vehicle',N:'N - No Class A or B passenger vehicle',V:'V - Medical variance',Other:'Other / State-specific'}
  };
  const driverForm=document.getElementById('fleet-driver-form'),licenseState=driverForm.elements.licenseState;
  const stateSelect=document.createElement('select');stateSelect.name='licenseState';
  stateSelect.innerHTML='<option value="">Select state</option>'+Object.entries(states).map(([code,label])=>'<option value="'+code+'">'+code+' - '+label+'</option>').join('');
  stateSelect.value=String(licenseState.value||'').toUpperCase();licenseState.replaceWith(stateSelect);
  Object.entries(driverChoices).forEach(([name,choices])=>{
    const input=driverForm.elements[name],field=input.closest('.field');
    input.type='hidden';input.removeAttribute('placeholder');
    field.style.position='relative';
    field.insertAdjacentHTML('beforeend','<details data-driver-dropdown style="border:1px solid var(--line);border-radius:6px"><summary style="cursor:pointer;padding:10px"><span data-driver-summary>Select '+name+'…</span></summary><div role="group" aria-label="'+name+'" data-driver-selection="'+name+'" style="display:grid;gap:8px;position:absolute;left:0;right:0;z-index:40;background:white;border:1px solid var(--line);border-radius:6px;padding:12px;max-height:350px;overflow:auto">'+Object.entries(choices).map(([code,label])=>'<label style="display:flex;align-items:center;gap:8px;font-weight:normal"><input type="checkbox" value="'+code+'" style="width:18px;height:18px;flex:none">'+esc(label)+'</label>').join('')+'<label hidden data-driver-other-label>'+esc('Other '+name)+'<input data-driver-other type="text" disabled></label></div></details><div data-driver-tags style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px" aria-live="polite"></div>');
    const group=field.querySelector('[data-driver-selection]');
    group.addEventListener('change',event=>{
      if(event.target.type==='checkbox'&&event.target.checked){
        group.querySelectorAll('input[type="checkbox"]').forEach(box=>{if(event.target.value==='None'?box!==event.target:box.value==='None')box.checked=false});
      }
      syncDriverSelections(driverForm);
    });
    group.querySelector('[data-driver-other]').addEventListener('input',()=>syncDriverSelections(driverForm));
  });
  function syncDriverSelections(form,record){
    if(record)form.elements.licenseState.value=String(record.licenseState||'').toUpperCase();
    Object.entries(driverChoices).forEach(([name,choices])=>{
      const group=form.querySelector('[data-driver-selection="'+name+'"]'),boxes=[...group.querySelectorAll('input[type="checkbox"]')],other=group.querySelector('[data-driver-other]');
      if(record){
        const raw=record[name]??'',text=Array.isArray(raw)?raw.join(', '):String(raw),customIndex=text.indexOf('Other:'),standard=customIndex<0?text:text.slice(0,customIndex),values=standard.split(/[,;]+/).map(value=>value.trim()).filter(Boolean),custom=customIndex<0?[]:[text.slice(customIndex+6).trim()];
        boxes.forEach(box=>box.checked=false);
        values.forEach(value=>{
          const code=Object.keys(choices).find(code=>code!=='Other'&&(value.toLowerCase()===code.toLowerCase()||value===choices[code]));
          if(code)boxes.find(box=>box.value===code).checked=true;
          else custom.push(value.replace(/^Other:\s*/i,''));
        });
        other.value=custom.join('; ');boxes.find(box=>box.value==='Other').checked=custom.length>0;
      }
      if(boxes.some(box=>box.checked&&box.value!=='None'))boxes.find(box=>box.value==='None').checked=false;
      const manual=boxes.find(box=>box.value==='Other').checked;
      other.disabled=!manual;group.querySelector('[data-driver-other-label]').hidden=!manual;
      if(!manual)other.value='';
      form.elements[name].value=boxes.filter(box=>box.checked).map(box=>box.value==='Other'?'Other: '+other.value.trim():box.value).join(', ');
      const selected=boxes.filter(box=>box.checked),field=group.closest('.field');
      field.querySelector('[data-driver-summary]').textContent=selected.length?selected.map(box=>box.value).join(', '):'Select '+name+'…';
      field.querySelector('[data-driver-tags]').innerHTML=selected.map(box=>'<span class="tag gray" style="white-space:normal;overflow-wrap:anywhere">'+esc(box.value==='Other'?other.value||'Other / State-specific':choices[box.value])+'</span>').join('');
    });
  }
  driverForm.addEventListener('submit',event=>{
    syncDriverSelections(driverForm);
    const missing=[...driverForm.querySelectorAll('[data-driver-other]')].find(input=>!input.disabled&&!input.value.trim());
    if(!missing)return;
    event.preventDefault();event.stopImmediatePropagation();missing.focus();
    if(typeof toast==='function')toast('Enter the Other / State-specific endorsement or restriction.');
  },true);
  driverForm.addEventListener('reset',()=>{driverForm.querySelectorAll('[data-driver-dropdown]').forEach(menu=>menu.open=false);setTimeout(()=>syncDriverSelections(driverForm),0)});
  document.addEventListener('click',event=>driverForm.querySelectorAll('[data-driver-dropdown]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false}));
  driverForm.addEventListener('keydown',event=>{if(event.key==='Escape')driverForm.querySelectorAll('[data-driver-dropdown]').forEach(menu=>menu.open=false)});
  syncDriverSelections(driverForm);
  const axleRatings=[[7000,'7,000 (2 x 3,500)'],[10400,'10,400 (2 x 5,200)'],[12000,'12,000 (2 x 6,000)'],[14000,'14,000 (2 x 7,000)'],[16000,'16,000 (2 x 8,000)'],[20000,'20,000 (2 x 10,000)'],[24000,'24,000 (2 x 12,000)']];
  const identityFields=kind=>`
    <div class="field"><label>Year</label><select name="year"><option value="">Select year</option>${Array.from({length:new Date().getFullYear()+2-1900},(_,index)=>new Date().getFullYear()+1-index).map(year=>'<option value="'+year+'">'+year+'</option>').join('')}</select></div>
    <div class="field"><label>Make</label><select name="make"><option value="">Select make</option>${Object.keys(vehicleCatalog[kind]).map(make=>'<option value="'+esc(make)+'">'+esc(make)+'</option>').join('')}<option value="other">Other / Not Listed</option></select></div>
    ${kind==='trailer'?'<div class="field"><label>Series / Type</label><select name="series" disabled><option value="">Select series / type</option></select></div>':''}
    <div class="field"><label>Model</label><select name="model" disabled><option value="">Select model</option></select></div>
    ${kind==='trailer'?'<div class="field"><label>Deck length (ft)</label><input name="deckLength" type="number" min="1" step="0.1"></div><div class="field"><label>Axle / wheel configuration</label><select name="axleConfiguration"><option value="">Select axle / wheel configuration</option><option>Tandem axle</option><option>Triple axle</option><option>Dual wheel</option><option>Single axle</option><option>Other / Custom</option></select></div>':''}
    <div class="field" hidden><label>Other make</label><input name="makeOther" disabled></div>
    <div class="field" hidden><label>Other model</label><input name="modelOther" disabled></div>
    <input name="makeModel" type="hidden">`;
  const truckFields=`
    ${identityFields('truck')}
    <div class="field"><label>Vehicle type</label><select name="vehicleType"><option value="">Select vehicle type</option><option>Pickup</option><option>Box truck</option><option>Straight truck</option><option>Cargo van</option><option>Tractor</option><option>Tow truck</option><option>Dump truck</option><option>Other</option></select></div>
    <div class="field"><label>Front GAWR (lb) <span class="subtle">(Active)</span></label><input name="frontGawr" type="number" min="1"></div>
    <div class="field"><label>Rear GAWR (lb) <span class="subtle">(Active)</span></label><input name="rearGawr" type="number" min="1"></div>
    <div class="field"><label>Manufacturer Payload Label (lb)</label><input name="manufacturerPayload" type="number" min="1"><span class="subtle">Enter exact payload value from the truck's Tire &amp; Loading / manufacturer door label. Manufacturer-rated occupant-and-cargo capacity, not estimated hauling capacity.</span></div>
    <div class="field"><label>Front tire size</label><input name="frontTireSize"></div>
    <div class="field"><label>Rear tire size</label><input name="rearTireSize"></div>
    <div class="field"><label>Front cold pressure (PSI)</label><input name="frontColdPsi" type="number" min="1"></div>
    <div class="field"><label>Rear cold pressure (PSI)</label><input name="rearColdPsi" type="number" min="1"></div>
    <div class="field"><label>Front-axle tire capacity (lb) <span class="subtle">(Active)</span></label><input name="frontTireCapacity" type="number" min="1"></div>
    <div class="field"><label>Rear-axle tire capacity (lb) <span class="subtle">(Active)</span></label><input name="rearTireCapacity" type="number" min="1"></div>
    <div class="field"><label>Hitch rating (lb) <span class="subtle">(Active)</span></label><input name="hitchCapacity" type="number" min="1"></div>
    <div class="field"><label>Ready-to-work scale date <span class="subtle">(Active)</span></label><input name="verificationDate" type="date"></div>
    <div class="field"><label>Weight verification</label><select name="weightBasis"><option value="planned">Planned / estimate</option><option value="scale-ticket">Scale ticket · full fuel and normal equipment</option><option value="manufacturer">Manufacturer document</option></select></div>`;
  const trailerFields=`
    ${identityFields('trailer')}
    <div class="field"><label>Combined axle rating (lb) <span class="subtle">(Active)</span></label><select name="axleCapacity"><option value="">Select actual axle rating</option>${axleRatings.map(([rating,label])=>'<option value="'+rating+'">'+label+'</option>').join('')}<option value="" data-custom-axle>Other / Enter actual rating</option></select></div>
    <div class="field" hidden><label for="fleet-trailer-axle-actual">Actual manufacturer/axle rating (lb)</label><input id="fleet-trailer-axle-actual" type="number" min="1" step="1" disabled></div>
    <div class="field"><label>Combined tire capacity (lb) <span class="subtle">(Active)</span></label><input name="tireCapacity" type="number" min="1"></div>
    <div class="field"><label>Hitch / coupler rating (lb) <span class="subtle">(Active)</span></label><input name="hitchCapacity" type="number" min="1"></div>
    <div class="field"><label>Ready-to-work scale date <span class="subtle">(Active)</span></label><input name="verificationDate" type="date"></div>
    <div class="field full"><label>Weight verification</label><select name="weightBasis"><option value="planned">Planned / estimate</option><option value="scale-ticket">Scale ticket · normal equipment included</option><option value="manufacturer">Manufacturer document</option></select></div>`;
  const truckForm=document.getElementById('fleet-truck-form'),trailerForm=document.getElementById('fleet-trailer-form');
  truckForm.querySelector('.form-actions').insertAdjacentHTML('beforebegin',truckFields);
  trailerForm.querySelector('.form-actions').insertAdjacentHTML('beforebegin',trailerFields);

  function syncAxleRating(form,record){
    const select=form.elements.axleCapacity,actual=form.querySelector('#fleet-trailer-axle-actual'),custom=select.querySelector('[data-custom-axle]');
    if(record){
      const value=record.axleCapacity==null?'':String(record.axleCapacity);
      const common=axleRatings.some(([rating])=>String(rating)===value);
      actual.value=common?'':value;custom.value=common?'':value;
      select.value=value;
      if(value&&!common)custom.selected=true;
    }
    const manual=select.selectedOptions[0]===custom;
    actual.disabled=!manual;actual.closest('.field').hidden=!manual;
    if(manual)custom.value=actual.value;
    else{actual.value='';custom.value=''}
  }
  trailerForm.elements.axleCapacity.addEventListener('change',()=>syncAxleRating(trailerForm));
  trailerForm.querySelector('#fleet-trailer-axle-actual').addEventListener('input',()=>syncAxleRating(trailerForm));
  trailerForm.addEventListener('reset',()=>setTimeout(()=>syncAxleRating(trailerForm),0));
  syncAxleRating(trailerForm);

  function syncIdentity(form,kind,record){
    const fields=form.elements,make=fields.make,model=fields.model;
    if(record){
      if(record.year&&![...fields.year.options].some(option=>option.value===String(record.year)))fields.year.add(new Option(String(record.year),String(record.year)));
      fields.year.value=record.year??'';
      const aliases={DiamondC:'Diamond C',LoadTrail:'Load Trail',SureTrac:'Sure-Trac',GreatDane:'Great Dane'};
      const legacy=String(record.makeModel||'').trim(),rawMake=record.make||Object.keys({...vehicleCatalog[kind],...aliases}).find(value=>legacy.startsWith(value+' ')),knownMake=aliases[rawMake]||rawMake;
      make.value=knownMake&&vehicleCatalog[kind][knownMake]?knownMake:(legacy||record.make?'other':'');
      fields.makeOther.value=record.makeOther||(make.value==='other'?record.make||'':'');
      const savedModel=record.model||(rawMake?legacy.slice(rawMake.length).trim():legacy);
      model.dataset.savedModel=savedModel;
      fields.modelOther.value=record.modelOther||(savedModel==='other'?'':savedModel);
    }
    let models=vehicleCatalog[kind][make.value]||[];
    if(kind==='trailer'){
      const series=fields.series,selectedSeries=record?.series??series.value,types=trailerTypes[make.value]||[];
      series.innerHTML='<option value="">Select series / type</option>'+['Manufacturer model',...types,'Other / Custom'].map(value=>'<option>'+esc(value)+'</option>').join('');
      if(selectedSeries&&![...series.options].some(option=>option.value===selectedSeries))series.add(new Option(selectedSeries,selectedSeries));
      series.value=selectedSeries;series.disabled=!make.value;
      const configurations=selectedSeries?trailerConfigurations[selectedSeries]||[]:types.flatMap(type=>trailerConfigurations[type]||[]);
      models=[...new Set([...models,...configurations])];
    }
    const savedModel=model.dataset.savedModel??model.value;
    model.innerHTML='<option value="">Select model</option>'+models.map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join('')+(make.value?'<option value="other">'+(kind==='trailer'?'Other / Custom Model or Configuration':'Other / Not Listed')+'</option>':'');
    model.disabled=!make.value;
    model.value=models.includes(savedModel)?savedModel:(savedModel?'other':'');
    delete model.dataset.savedModel;
    const manualMake=make.value==='other',manualModel=model.value==='other';
    fields.makeOther.disabled=!manualMake;fields.makeOther.closest('.field').hidden=!manualMake;
    fields.modelOther.disabled=!manualModel;fields.modelOther.closest('.field').hidden=!manualModel;
    fields.makeOther.required=manualMake;fields.modelOther.required=manualModel;
    if(!manualMake)fields.makeOther.value='';
    if(!manualModel)fields.modelOther.value='';
    fields.makeModel.value=[manualMake?fields.makeOther.value:make.value,manualModel?fields.modelOther.value:model.value].filter(Boolean).join(' ').trim();
  }
  [[truckForm,'truck'],[trailerForm,'trailer']].forEach(([form,kind])=>{
    form.elements.make.addEventListener('change',()=>{form.elements.model.value='';form.elements.makeOther.value='';form.elements.modelOther.value='';if(form.elements.series)form.elements.series.value='';syncIdentity(form,kind)});
    form.elements.series?.addEventListener('change',()=>{form.elements.model.value='';form.elements.modelOther.value='';syncIdentity(form,kind)});
    form.elements.model.addEventListener('change',()=>syncIdentity(form,kind));
    ['makeOther','modelOther'].forEach(name=>form.elements[name].addEventListener('input',()=>syncIdentity(form,kind)));
    form.addEventListener('submit',event=>{
      syncIdentity(form,kind);
      const missing=fieldsForIdentity(form).find(control=>!control.value.trim());
      if(!missing)return;
      event.preventDefault();event.stopImmediatePropagation();missing.focus();
      if(typeof toast==='function')toast('Complete the selected vehicle make and model.');
    },true);
    form.addEventListener('reset',()=>setTimeout(()=>syncIdentity(form,kind),0));
    syncIdentity(form,kind);
  });
  function fieldsForIdentity(form){
    return [form.elements.model,form.elements.makeOther,form.elements.modelOther].filter(control=>!control.disabled&&(control.required||control===form.elements.model&&form.elements.make.value));
  }
  function restoreFleetControls(form,kind,record){
    if(kind==='driver')syncDriverSelections(form,record);
    else{syncIdentity(form,kind,record);if(kind==='trailer')syncAxleRating(form,record)}
  }
  window.FLTFleetIdentity={restore:restoreFleetControls};
  fleet.querySelectorAll('select').forEach(select=>{
    if(![...select.options].some(option=>option.value===''))select.insertBefore(new Option('Select...', '',true,true),select.firstChild);
  });

  const firstGrid=fleet.querySelector('.grid.three');
  const manager=document.createElement('div');manager.id='v35-fleet-master-manager';manager.className='panel';manager.style.marginTop='14px';
  manager.innerHTML=`<div class="section-head"><div><div class="eyebrow">Enter once · controlled changes</div><h2>Edit Saved Master Records</h2><p class="subtle" style="margin-top:5px">Choose an existing record, state why it is changing, then update it. Completed-load snapshots remain unchanged.</p></div><span class="tag">AUDITED</span></div>
    <div class="form-grid" style="margin-top:14px">
      <div class="field"><label>Record type</label><select id="v35-master-type"><option value="drivers">Driver</option><option value="trucks">Truck</option><option value="trailers">Trailer</option></select></div>
      <div class="field"><label>Saved record</label><select id="v35-master-record"></select></div>
      <div class="field full"><label>Authorized change reason</label><select id="v35-master-reason"></select></div>
      <div class="field full" id="v35-master-reason-detail-field" hidden><label>Brief explanation</label><input id="v35-master-reason-detail" maxlength="120" placeholder="Describe the authorized change"></div>
      <div class="form-actions field full"><button class="btn primary" id="v35-master-edit" type="button">Load Record for Editing</button><button class="btn danger" id="v35-master-remove" type="button">Cancel Selected Record</button><button class="btn" id="v35-master-cancel" type="button" hidden>Cancel Edit</button></div>
    </div>
    <div class="notice" id="v35-master-notice" style="margin-bottom:0">Planned records may be completed here after the actual ratings and ready-to-work scale weight are verified.</div>`;
  firstGrid.insertAdjacentElement('afterend',manager);

  const regularRig=document.createElement('div');regularRig.id='v36-regular-rig';regularRig.className='panel';regularRig.style.marginTop='14px';
  regularRig.innerHTML=`<div class="section-head"><div><div class="eyebrow">One-click owner-operator setup</div><h2>My Regular Rig</h2><p class="subtle" style="margin-top:5px">Save the driver, truck, and trailer normally used together. This verified combination will be selected automatically for estimates and dispatch.</p></div><span class="tag orange" id="v36-rig-status">NOT SAVED</span></div>
    <div class="form-grid" style="margin-top:14px"><div class="field"><label>Driver</label><select id="v36-rig-driver"></select></div><div class="field"><label>Truck</label><select id="v36-rig-truck"></select></div><div class="field"><label>Trailer</label><select id="v36-rig-trailer"></select></div>
      <div class="form-actions field full"><button class="btn primary" id="v36-rig-save" type="button">Save My Regular Rig</button><button class="btn" id="v36-rig-clear" type="button">Clear Regular Rig</button></div></div>
    <div class="notice" id="v36-rig-notice" style="margin-bottom:0">Only Active / Verified records can be saved as the regular rig.</div>`;
  manager.insertAdjacentElement('afterend',regularRig);

  const type=document.getElementById('v35-master-type'),recordSelect=document.getElementById('v35-master-record'),reason=document.getElementById('v35-master-reason'),reasonDetail=document.getElementById('v35-master-reason-detail'),reasonDetailField=document.getElementById('v35-master-reason-detail-field'),notice=document.getElementById('v35-master-notice');
  const bucketLabel={drivers:'driver',trucks:'truck',trailers:'trailer'};
  const regularRigKey='flt-v36-regular-rig',legacyRigKey='flt-v35-default-fleet-selection';
  const validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim());
  const driverReady=x=>{if(x?.status!=='active'||!x.licenseState||!x.expiration)return false;const expiration=new Date(x.expiration+'T23:59:59');return Number.isFinite(expiration.getTime())&&expiration>=new Date()};
  const truckReady=x=>Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&window.FLTDate.isNotFuture(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.gcwr)>=Number(x.gvwr)&&Number(x.emptyWeight)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.frontGawr)+Number(x.rearGawr)>=Number(x.gvwr)&&Number(x.frontTireCapacity)>=Number(x.frontGawr)&&Number(x.rearTireCapacity)>=Number(x.rearGawr)&&Number(x.hitchCapacity)>0);
  const trailerReady=x=>Boolean(x?.status==='active'&&validVin(x.vin)&&x.weightBasis==='scale-ticket'&&window.FLTDate.isNotFuture(x.verificationDate)&&Number(x.gvwr)>0&&Number(x.emptyWeight)>0&&Number(x.emptyWeight)<Number(x.gvwr)&&Number(x.axleCapacity)>=Number(x.gvwr)&&Number(x.tireCapacity)>=Number(x.gvwr)&&Number(x.hitchCapacity)>=Number(x.gvwr));
  function syncTruckPlanningReference(){
    if(window.FLTBusinessFleetBridge){window.FLTBusinessFleetBridge.apply();return}
    const field=document.getElementById('v35-truck-gvwr');if(!field)return;
    const trucks=read().trucks.filter(truckReady),ids=['flt-v38-current-working-rig','flt-v36-regular-rig','flt-v35-default-fleet-selection'].map(key=>{try{return JSON.parse(localStorage.getItem(key)||'{}').truckId}catch(error){return''}});
    const truck=ids.map(id=>trucks.find(item=>item.id===id)).find(Boolean)||(trucks.length===1?trucks[0]:null);
    field.value=truck?String(truck.gvwr):'';
  }
  syncTruckPlanningReference();
  window.addEventListener('flt:modules-loaded',syncTruckPlanningReference);
  window.addEventListener('flt:workflow-state-changed',syncTruckPlanningReference);
  document.addEventListener('submit',()=>setTimeout(syncTruckPlanningReference,400),true);
  document.getElementById('v36-rig-save')?.addEventListener('click',()=>setTimeout(syncTruckPlanningReference,0));
  const changeReasons={
    drivers:['Complete planned record with verified information','Correct a data-entry mistake','Renew driver license','Update qualification, endorsement, or restriction','Change operating area','Change driver status'],
    trucks:['Complete planned record with verified information','Correct a data-entry mistake','Add or update scale ticket','Update manufacturer ratings','Update tires, wheels, or pressures','Update hitch or installed equipment','Change truck status'],
    trailers:['Complete planned record with verified information','Correct a data-entry mistake','Add or update scale ticket','Update manufacturer ratings','Update tires, axles, or suspension','Update hitch or coupler','Change trailer status']
  };
  const cancelReasons={
    drivers:['Duplicate or test record','Record entered by mistake','Driver no longer with company','Driver no longer operating','License or qualification no longer valid'],
    trucks:['Duplicate or test record','Record entered by mistake','Truck sold or transferred','Truck permanently removed from service','Truck replaced in fleet'],
    trailers:['Duplicate or test record','Record entered by mistake','Trailer sold or transferred','Trailer permanently removed from service','Trailer replaced in fleet']
  };
  function refreshRecords(){
    const data=read(),items=(data[type.value]||[]).filter(x=>x.status!=='cancelled');
    recordSelect.innerHTML='<option value="">Select saved '+bucketLabel[type.value]+'</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||x.unit)+' · '+(x.status==='active'?'Active / Verified':'Planned')+'</option>').join('');
  }
  function refreshReasons(){
    reason.innerHTML='<option value="">Select reason</option><optgroup label="Edit record">'+changeReasons[type.value].map(value=>'<option value="edit|'+esc(value)+'">'+esc(value)+'</option>').join('')+'<option value="edit|other">Other authorized change</option></optgroup><optgroup label="Cancel record">'+cancelReasons[type.value].map(value=>'<option value="cancel|'+esc(value)+'">'+esc(value)+'</option>').join('')+'<option value="cancel|other">Other cancellation reason</option></optgroup>';
    reasonDetail.value='';reasonDetailField.hidden=true;
  }
  function authorizedReason(action){
    const [selectedAction,...selectedParts]=reason.value.split('|'),selected=selectedParts.join('|');
    if(selectedAction!==action)return'';
    if(selected!=='other')return selected;
    return reasonDetail.value.trim()?(action==='cancel'?'Other cancellation reason — ':'Other authorized change — ')+reasonDetail.value.trim():'';
  }
  type.addEventListener('change',()=>{refreshRecords();refreshReasons()});
  reason.addEventListener('change',()=>{const other=reason.value.endsWith('|other');reasonDetailField.hidden=!other;if(other)reasonDetail.focus();else reasonDetail.value=''});
  refreshRecords();refreshReasons();

  const rigSelect={driver:document.getElementById('v36-rig-driver'),truck:document.getElementById('v36-rig-truck'),trailer:document.getElementById('v36-rig-trailer')};
  function readRegularRig(){try{return JSON.parse(localStorage.getItem(regularRigKey)||localStorage.getItem(legacyRigKey)||'{}')}catch(error){return{}}}
  function applyRigToDispatch(rig){
    ['driver','truck','trailer'].forEach(kind=>{const select=document.getElementById('fleet-lock-'+kind),id=rig[kind+'Id'];if(select&&[...select.options].some(option=>option.value===id))select.value=id});
  }
  function populateRegularRig(){
    const data=read(),saved=readRegularRig(),groups={driver:[data.drivers,driverReady],truck:[data.trucks,truckReady],trailer:[data.trailers,trailerReady]};
    Object.entries(groups).forEach(([kind,[items,ready]])=>{const verified=items.filter(ready),select=rigSelect[kind];select.innerHTML='<option value="">Select verified '+kind+'</option>'+verified.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.name||item.unit)+'</option>').join('');const savedId=saved[kind+'Id'];select.value=verified.some(item=>item.id===savedId)?savedId:(verified.length===1?verified[0].id:'')});
    const selected=['driver','truck','trailer'].every(kind=>rigSelect[kind].value),savedMatches=selected&&['driver','truck','trailer'].every(kind=>rigSelect[kind].value===saved[kind+'Id']);
    const status=document.getElementById('v36-rig-status'),notice=document.getElementById('v36-rig-notice');status.textContent=savedMatches?'READY':'NOT SAVED';status.className='tag '+(savedMatches?'':'orange');
    notice.textContent=savedMatches?'Regular rig is ready and will be selected automatically.':selected?'Verified records found. Save this combination once for automatic selection.':'Complete one verified driver, truck, and trailer before saving a regular rig.';
    if(savedMatches)applyRigToDispatch(saved);
  }
  document.getElementById('v36-rig-save').addEventListener('click',()=>{const rig={driverId:rigSelect.driver.value,truckId:rigSelect.truck.value,trailerId:rigSelect.trailer.value,savedAt:new Date().toISOString()};if(!rig.driverId||!rig.truckId||!rig.trailerId){document.getElementById('v36-rig-notice').innerHTML='<strong>Select one verified driver, truck, and trailer.</strong>';return}localStorage.setItem(regularRigKey,JSON.stringify(rig));localStorage.setItem(legacyRigKey,JSON.stringify(rig));applyRigToDispatch(rig);populateRegularRig();if(typeof toast==='function')toast('My Regular Rig saved and selected for dispatch.')});
  document.getElementById('v36-rig-clear').addEventListener('click',()=>{localStorage.removeItem(regularRigKey);localStorage.removeItem(legacyRigKey);['driver','truck','trailer'].forEach(kind=>rigSelect[kind].value='');populateRegularRig();if(typeof toast==='function')toast('Regular rig selection cleared. Master records were not changed.')});
  ['fleet-driver-form','fleet-truck-form','fleet-trailer-form'].forEach(id=>document.getElementById(id)?.addEventListener('submit',()=>setTimeout(populateRegularRig,0)));
  populateRegularRig();

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
        restoreFleetControls(form,kind,saved);
        setActiveRequirements(form,kind);
      }
      delete form.dataset.editId;delete form.dataset.editReason;
      form.querySelector('button[type="submit"],button:not([type])').textContent='Save '+kind;
      form.querySelectorAll('.field-error-control,.guided-current-control').forEach(control=>control.classList.remove('field-error-control','guided-current-control'));
    });
    document.getElementById('v35-master-cancel').hidden=true;
    if(clearReason){reason.value='';reasonDetail.value='';reasonDetailField.hidden=true}
  }
  function cancelEdit(){
    clearEditState(true,true);notice.textContent='Edit cancelled. No saved record was changed.';
    window.dispatchEvent(new CustomEvent('flt:master-record-edit-end'));
  }
  document.getElementById('v35-master-cancel').addEventListener('click',cancelEdit);
  document.getElementById('v35-master-edit').addEventListener('click',()=>{
    const data=read(),bucket=type.value,record=(data[bucket]||[]).find(x=>x.id===recordSelect.value);
    if(!record){notice.innerHTML='<strong>Select a saved record first.</strong>';recordSelect.focus();return}
    if(!reason.value){notice.innerHTML='<strong>Select the authorized change reason first.</strong>';reason.focus();return}
    const selectedReason=authorizedReason('edit');
    if(!selectedReason){notice.innerHTML='<strong>Select an Edit record reason. Use a Cancel record reason only with Cancel Selected Record.</strong>';reason.focus();return}
    clearEditState(true,false);
    const kind=bucketLabel[bucket],form=document.getElementById('fleet-'+kind+'-form');
    Object.entries(record).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??''});
    restoreFleetControls(form,kind,record);
    form.dataset.editId=record.id;form.dataset.editReason=selectedReason;setActiveRequirements(form,kind);
    form.querySelector('button[type="submit"],button:not([type])').textContent='Update '+kind;
    document.getElementById('v35-master-cancel').hidden=false;
    notice.innerHTML='<strong>Editing '+esc(record.name||record.unit)+'.</strong><br>Review every highlighted Active / Verified field, then press Update '+kind+'.';
    // Layout modules (e.g. the V3.8 master-record hub) may have collapsed the entry forms; they must reveal this form synchronously before it is scrolled into view.
    window.dispatchEvent(new CustomEvent('flt:master-record-edit-start',{detail:{kind,bucket,id:record.id,formId:form.id}}));
    form.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input,select')?.focus({preventScroll:true});
  });
  document.getElementById('v35-master-remove').addEventListener('click',()=>{
    const data=read(),bucket=type.value,index=(data[bucket]||[]).findIndex(x=>x.id===recordSelect.value),record=data[bucket]?.[index];
    if(!record){notice.innerHTML='<strong>Select a saved record first.</strong>';recordSelect.focus();return}
    if(!reason.value){notice.innerHTML='<strong>Select a cancellation reason first.</strong>';reason.focus();return}
    const selectedReason=authorizedReason('cancel');
    if(!selectedReason){notice.innerHTML='<strong>Select a Cancel record reason. Use an Edit record reason only when loading a record for editing.</strong>';reason.focus();return}
    const label=record.name||record.unit;
    if(!confirm('Cancel '+label+'?\n\nIt will be removed from future dispatch choices. Existing trip history will remain unchanged.'))return;
    const before={...record},cancelledAt=new Date().toISOString(),after={...record,status:'cancelled',cancelledAt,cancelReason:selectedReason};
    data[bucket][index]=after;data.audit=data.audit||[];data.audit.push({action:'master_record_cancelled',entityId:record.id,entityType:bucketLabel[bucket],timestamp:cancelledAt,reason:selectedReason,reasons:[selectedReason],before,after:{...after}});
    [regularRigKey,legacyRigKey].forEach(key=>{try{const rig=JSON.parse(localStorage.getItem(key)||'{}');if(Object.values(rig).includes(record.id))localStorage.removeItem(key)}catch(error){}});
    localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('flt-v35-resume-view','fleet');
    if(typeof toast==='function')toast(label+' cancelled and recorded in the audit trail.');
    setTimeout(()=>location.reload(),250);
  });

  function validateActive(form,kind){
    if(form.elements.status?.value!=='active')return null;
    const names=kind==='truck'?['vin','gvwr','gcwr','emptyWeight','frontGawr','rearGawr','frontTireCapacity','rearTireCapacity','hitchCapacity','verificationDate']:kind==='trailer'?['vin','gvwr','emptyWeight','axleCapacity','tireCapacity','hitchCapacity','verificationDate']:['licenseState','expiration'];
    const missing=names.find(name=>!String(form.elements[name]?.value||'').trim());
    if(missing)return{control:form.elements[missing],message:'Complete the highlighted Active / Verified field.'};
    const fail=(name,message)=>({control:form.elements[name],message}),n=name=>Number(form.elements[name]?.value),validVin=value=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value||'').trim()),validScaleDate=value=>window.FLTDate.isNotFuture(value);
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
