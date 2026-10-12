(() => {
  'use strict';
  const KEY='flt-v32-customers';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const text=value=>String(value??'').trim();
  const normalized=value=>text(value).toLowerCase().replace(/[^a-z0-9]/g,'');
  const address=value=>({facility:text(value?.facility),street:text(value?.street),city:text(value?.city),state:text(value?.state).toUpperCase(),zip:text(value?.zip)});
  const addressKey=value=>[value?.street,value?.city,value?.state,value?.zip].map(normalized).join('|');
  const id=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  function createApi(storage){
    function read(){
      let records=[];
      try{const saved=JSON.parse(storage.getItem(KEY)||'[]');if(Array.isArray(saved))records=saved}catch(error){}
      return records.map((record,index)=>({...record,id:record.id||'CUST-LEGACY-'+index,name:text(record.name||record.legalName),legalName:text(record.legalName||record.name),type:record.type||'Direct Customer',billingAddress:address(record.billingAddress||record.customerAddress||record.address||record),phone:text(record.phone),email:text(record.email),primaryContact:text(record.primaryContact),contacts:Array.isArray(record.contacts)?copy(record.contacts):[],terms:text(record.terms),notes:text(record.notes),pickupLocations:Array.isArray(record.pickupLocations)?copy(record.pickupLocations):[],deliveryLocations:Array.isArray(record.deliveryLocations)?copy(record.deliveryLocations):[],isTest:record.isTest===true,status:record.status||'active',history:Array.isArray(record.history)?copy(record.history):[]}));
    }
    function write(records){
      try{const raw=storage.getItem(KEY);if(raw&&!Array.isArray(JSON.parse(raw)))return false;storage.setItem(KEY,JSON.stringify(records));return true}catch(error){return false}
    }
    const list=()=>read().filter(record=>record.status!=='archived');
    const get=customerId=>read().find(record=>record.id===customerId)||null;
    const search=query=>list().filter(record=>normalized(record.name).includes(normalized(query))||normalized(record.legalName).includes(normalized(query)));
    function duplicates(input,excludeId){
      const billing=address(input.billingAddress||input),phone=normalized(input.phone),email=text(input.email).toLowerCase();
      return list().filter(record=>record.id!==excludeId&&(normalized(record.name)===normalized(input.name)||phone&&phone===normalized(record.phone)||email&&email===record.email.toLowerCase()||billing.street&&billing.zip&&addressKey(billing)===addressKey(record.billingAddress)));
    }
    function save(input,{allowDuplicate=false,reason='Customer master updated'}={}){
      if(!text(input.name))return{ok:false,error:'Customer name is required.'};
      const records=read(),index=input.id?records.findIndex(record=>record.id===input.id):-1;
      if(input.id&&index<0)return{ok:false,error:'Customer record was not found.'};
      const matches=duplicates(input,input.id);
      if(index<0&&matches.length&&!allowDuplicate)return{ok:false,duplicates:matches,error:'Possible existing customer found.'};
      const now=new Date().toISOString(),before=index>=0?records[index]:null;
      const record={...before,...copy(input),id:before?.id||id('CUST'),name:text(input.name),legalName:text(input.legalName||input.name),type:input.type||before?.type||'Direct Customer',billingAddress:address(input.billingAddress||before?.billingAddress||input),contacts:copy(input.contacts||before?.contacts||[]),pickupLocations:copy(input.pickupLocations||before?.pickupLocations||[]),deliveryLocations:copy(input.deliveryLocations||before?.deliveryLocations||[]),isTest:input.isTest??before?.isTest??false,status:input.status||before?.status||'active',createdAt:before?.createdAt||now,updatedAt:now,history:before?.history||[]};
      ['phone','email','primaryContact','terms','notes'].forEach(key=>record[key]=text(input[key]??before?.[key]));
      Object.assign(record,record.billingAddress);
      const {history:priorHistory,...prior}=before||{};
      record.history=[...record.history,{action:before?'updated':'created',timestamp:now,reason,before:before?copy(prior):null}];
      if(index>=0)records[index]=record;else records.push(record);
      if(!write(records))return{ok:false,error:'Customer Master could not be saved. Existing stored data has been preserved; check browser storage or restore an exported backup.'};
      return{ok:true,record:copy(record)};
    }
    function addLocation(customerId,kind,location){
      if(!['pickup','delivery'].includes(kind))return{ok:false,error:'Invalid location type.'};
      const record=get(customerId),value=address(location);
      if(!record||!value.street||!value.city||!value.state||!value.zip)return{ok:false,error:'Complete the location address.'};
      const key=kind+'Locations',existing=record[key].find(item=>addressKey(item)===addressKey(value)&&normalized(item.facility)===normalized(value.facility));
      if(existing)return{ok:true,record,location:copy(existing)};
      const saved={...value,id:id('LOC')};record[key].push(saved);
      const result=save(record,{reason:'Saved '+kind+' location added'});
      return{...result,location:copy(saved)};
    }
    function archive(customerId,reason){
      const record=get(customerId);if(!record||!text(reason))return{ok:false,error:'A deletion reason is required.'};
      return save({...record,status:'archived'},{reason:'Customer archived: '+text(reason)});
    }
    function snapshot(customerId){
      const record=get(customerId);if(!record)return null;
      const {history,...value}=record;return copy(value);
    }
    function migrateLoads(loads){
      for(const load of loads){
        if(!text(load.customer)||String(load.id||'').startsWith('DEMO-')||read().some(record=>normalized(record.name)===normalized(load.customer)))continue;
        const prior=load.customerSnapshot||{};
        save({...prior,name:load.customer,billingAddress:load.billingAddress||load.customerAddress||{},phone:prior.phone||load.customerPhone,email:prior.email||load.customerEmail},{allowDuplicate:true,reason:'Imported existing customer history'});
      }
    }
    return{KEY,read,list,get,search,duplicates,save,addLocation,archive,snapshot,migrateLoads,migrate(){const records=read();if(records.length)write(records);return records}};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={createApi,normalized,addressKey};
  if(typeof window==='undefined')return;
  const api=createApi(localStorage);api.migrate();window.FLTCustomerMaster=api;
  try{const loads=JSON.parse(localStorage.getItem('flt-v32-loads')||'[]');if(Array.isArray(loads))api.migrateLoads(loads)}catch(error){}
  if(typeof document==='undefined')return;
  const esc=value=>text(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const loadForm=document.getElementById('load-form'),nameInput=document.getElementById('customer-name');
  if(!loadForm||!nameInput)return;
  let selectedId='',allowDuplicate=false,editingId='';
  const types=['Direct Customer','Shipper','Broker','Other'];
  const typeOptions='<option value="">Select customer type</option>'+types.map(type=>'<option>'+type+'</option>').join('');
  const inputField=(label,name,type='text')=>'<div class="field"><label>'+label+'<input name="'+name+'" type="'+type+'"></label></div>';
  const addressFields=prefix=>['street','city','state','zip'].map(part=>inputField(part==='zip'?'ZIP':part[0].toUpperCase()+part.slice(1),prefix+part)).join('');
  const intake=document.createElement('div');intake.className='field full';intake.id='v38-customer-intake';
  intake.innerHTML='<div class="form-grid"><div class="field"><label>Customer type<select id="customer-type">'+typeOptions+'</select></label></div>'+[['Main phone','customer-phone','tel'],['Email','customer-email','email'],['Primary contact','customer-contact','text'],['Payment terms','customer-terms','text']].map(([label,field,type])=>'<div class="field"><label>'+label+'<input id="'+field+'" type="'+type+'"></label></div>').join('')+'<div class="field full"><label>Customer notes<textarea id="customer-notes"></textarea></label></div><div class="field full"><label style="display:flex;gap:8px;align-items:center"><input id="customer-test-record" type="checkbox" style="width:18px;height:18px">Development / fictitious customer</label></div><div class="form-actions field full"><button type="button" class="btn" id="customer-use-billing" disabled>Use saved billing address</button><button type="button" class="btn" id="customer-open-master">Customer Master</button></div><div class="field full" id="customer-load-duplicate" hidden></div></div>';
  nameInput.closest('.field').insertAdjacentElement('afterend',intake);
  for(const kind of ['pickup','delivery']){
    const field=document.getElementById(kind+'-facility')?.closest('.field');if(!field)continue;
    field.insertAdjacentHTML('beforebegin','<div class="field full"><label>Saved '+kind+' location<select id="customer-'+kind+'-location"><option value="">Select saved '+kind+' location</option></select></label><label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input id="customer-save-'+kind+'" type="checkbox" style="width:18px;height:18px">Save this '+kind+' location to Customer Master</label></div>');
  }
  const section=document.createElement('section');section.id='customers';section.className='view';
  section.innerHTML='<div class="section-head"><div><div class="eyebrow">Reusable customer records</div><h2>Customer Master</h2></div><button class="btn" id="customer-master-new" type="button">New customer</button></div><div class="form-grid" style="margin-top:14px"><div class="field"><label>Find customer<input id="customer-master-search" type="search"></label></div><div class="field"><label>Saved customer<select id="customer-master-record"><option value="">Select customer</option></select></label></div></div><form id="customer-master-form" class="form-grid" style="margin-top:18px">'+inputField('Customer / operating name','name')+inputField('Legal name','legalName')+'<div class="field"><label>Customer type<select name="type">'+typeOptions+'</select></label></div>'+inputField('Main phone','phone','tel')+inputField('Email','email','email')+inputField('Primary contact','primaryContact')+inputField('Payment terms','terms')+'<div class="field full"><h3>Billing Address</h3></div>'+addressFields('billing_')+'<div class="field full"><label>Customer notes<textarea name="notes"></textarea></label></div><div class="field full"><label style="display:flex;gap:8px;align-items:center"><input name="isTest" type="checkbox" style="width:18px;height:18px">Development / fictitious customer</label></div><div class="field full"><div class="section-head"><h3>Additional Contacts</h3><button class="btn" data-add-customer-row="contact" type="button">Add contact</button></div><div id="customer-master-contacts"></div></div>'+['pickup','delivery'].map(kind=>'<div class="field full"><div class="section-head"><h3>Saved '+kind+' Locations</h3><button class="btn" data-add-customer-row="'+kind+'" type="button">Add location</button></div><div id="customer-master-'+kind+'"></div></div>').join('')+'<div class="field full" id="customer-master-duplicate" hidden></div><div class="field full" id="customer-master-status" aria-live="polite"></div><div class="form-actions field full"><button class="btn primary" type="submit">Save customer</button><button class="btn danger" id="customer-master-delete" type="button" disabled>Delete customer</button></div></form>';
  document.querySelector('main').appendChild(section);
  const nav=document.getElementById('nav'),navButton=document.createElement('button');navButton.dataset.view='customers';
  navButton.innerHTML='<span class="nav-icon">&#9783;</span><span class="nav-label">Customers</span>';nav.appendChild(navButton);
  function openMaster(){
    document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id==='customers'));
    nav.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button===navButton));
    document.getElementById('page-title').textContent='Customer Master.';
    document.getElementById('page-subtitle').textContent='Billing, contacts, and saved customer locations.';
    refreshMasterList();window.scrollTo({top:0,behavior:'instant'});
  }
  navButton.addEventListener('click',openMaster);
  document.getElementById('customer-open-master').addEventListener('click',()=>{openMaster();if(selectedId)editCustomer(selectedId)});
  const masterForm=document.getElementById('customer-master-form'),masterRecord=document.getElementById('customer-master-record');
  function refreshMasterList(){
    const query=document.getElementById('customer-master-search').value,records=api.search(query);
    masterRecord.innerHTML='<option value="">Select customer</option>'+records.map(record=>'<option value="'+esc(record.id)+'">'+esc(record.name)+' - '+esc(record.billingAddress.city||record.email)+'</option>').join('');
    masterRecord.value=editingId;
  }
  function addRow(kind,value={}){
    const row=document.createElement('div');row.className='form-grid';row.dataset.customerRow=kind;row.dataset.locationId=value.id||'';row.style.marginTop='12px';
    const fields=kind==='contact'?['name','phone','email','role']:['facility','street','city','state','zip'];
    row.innerHTML=fields.map(part=>'<div class="field"><label>'+esc(part==='zip'?'ZIP':part[0].toUpperCase()+part.slice(1))+'<input data-customer-part="'+part+'" value="'+esc(value[part])+'"></label></div>').join('')+'<div class="field"><button class="btn" type="button" title="Remove '+kind+'" aria-label="Remove '+kind+'">&times;</button></div>';
    row.querySelector('button').addEventListener('click',()=>row.remove());
    document.getElementById('customer-master-'+(kind==='contact'?'contacts':kind)).appendChild(row);
  }
  function editCustomer(customerId){
    const record=customerId?api.get(customerId):null;editingId=record?.id||'';
    masterForm.reset();masterForm.querySelectorAll('[data-customer-row]').forEach(row=>row.remove());
    for(const key of ['name','legalName','type','phone','email','primaryContact','terms','notes'])masterForm.elements[key].value=record?.[key]||'';
    for(const part of ['street','city','state','zip'])masterForm.elements['billing_'+part].value=record?.billingAddress[part]||'';
    masterForm.elements.isTest.checked=record?.isTest===true;
    (record?.contacts||[]).forEach(value=>addRow('contact',value));
    for(const kind of ['pickup','delivery'])(record?.[kind+'Locations']||[]).forEach(value=>addRow(kind,value));
    document.getElementById('customer-master-delete').disabled=!record;
    document.getElementById('customer-master-status').textContent='';
    document.getElementById('customer-master-duplicate').hidden=true;masterRecord.value=editingId;
  }
  function readRows(kind){
    return [...masterForm.querySelectorAll('[data-customer-row="'+kind+'"]')].map(row=>{
      const value=Object.fromEntries([...row.querySelectorAll('[data-customer-part]')].map(control=>[control.dataset.customerPart,text(control.value)]));
      if(kind!=='contact'){value.id=row.dataset.locationId||id('LOC');value.state=value.state.toUpperCase()}
      return value;
    }).filter(value=>Object.values(value).some(Boolean));
  }
  function duplicateWarning(host,matches,useExisting,createAnyway){
    host.hidden=false;
    host.innerHTML='<div class="notice"><strong>Possible existing customer found.</strong><select aria-label="Possible existing customer">'+matches.map(record=>'<option value="'+esc(record.id)+'">'+esc(record.name)+' - '+esc([record.billingAddress.street,record.billingAddress.city,record.email].filter(Boolean).join(', '))+'</option>').join('')+'</select><div class="form-actions" style="margin-top:10px"><button type="button" class="btn primary" data-use-existing>Use Existing Customer</button><button type="button" class="btn" data-create-anyway>Create New Customer Anyway</button></div></div>';
    host.querySelector('[data-use-existing]').addEventListener('click',()=>{host.hidden=true;useExisting(host.querySelector('select').value)});
    host.querySelector('[data-create-anyway]').addEventListener('click',()=>{host.hidden=true;createAnyway()});
  }
  function saveMaster(override=false){
    const input=Object.fromEntries(new FormData(masterForm).entries());input.id=editingId||undefined;
    input.billingAddress=Object.fromEntries(['street','city','state','zip'].map(part=>[part,input['billing_'+part]]));
    input.contacts=readRows('contact');input.pickupLocations=readRows('pickup');input.deliveryLocations=readRows('delivery');input.isTest=masterForm.elements.isTest.checked;
    const result=api.save(input,{allowDuplicate:override});
    if(result.duplicates){duplicateWarning(document.getElementById('customer-master-duplicate'),result.duplicates,editCustomer,()=>saveMaster(true));return}
    document.getElementById('customer-master-status').textContent=result.ok?'Customer saved.':result.error;
    if(result.ok){editingId=result.record.id;refreshMasterList();document.getElementById('customer-master-delete').disabled=false;if(selectedId===editingId)selectCustomer(editingId);window.dispatchEvent(new Event('flt:customer-master-saved'))}
  }
  masterForm.addEventListener('submit',event=>{event.preventDefault();saveMaster()});
  section.querySelectorAll('[data-add-customer-row]').forEach(button=>button.addEventListener('click',()=>addRow(button.dataset.addCustomerRow)));
  document.getElementById('customer-master-new').addEventListener('click',()=>editCustomer(''));
  document.getElementById('customer-master-search').addEventListener('input',refreshMasterList);
  masterRecord.addEventListener('change',()=>editCustomer(masterRecord.value));
  document.getElementById('customer-master-delete').addEventListener('click',()=>{
    if(!editingId||!confirm('Delete this customer from future selections? Historical load and invoice snapshots will remain unchanged.'))return;
    const reason=prompt('Reason for deleting this customer:');if(!reason)return;
    api.archive(editingId,reason);if(selectedId===editingId)clearSelection();editCustomer('');refreshMasterList();
  });
  function fillAddress(kind,value){
    for(const part of ['facility','street','city','state','zip']){const control=document.getElementById(kind+'-'+part);if(control)control.value=value?.[part]||''}
    document.getElementById(kind+'-zip')?.dispatchEvent(new Event('flt:address-selected',{bubbles:true}));
    for(const part of ['facility','street','city','state'])document.getElementById(kind+'-'+part)?.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function selectCustomer(customerId){
    const record=api.get(customerId);if(!record||record.status==='archived')return;
    selectedId=customerId;api.selectedId=selectedId;allowDuplicate=false;nameInput.value=record.name;
    for(const [field,key] of [['customer-type','type'],['customer-phone','phone'],['customer-email','email'],['customer-contact','primaryContact'],['customer-terms','terms'],['customer-notes','notes']])document.getElementById(field).value=record[key]||'';
    document.getElementById('customer-test-record').checked=record.isTest;
    document.getElementById('billing-same-as-delivery').checked=false;fillAddress('billing',record.billingAddress);
    document.getElementById('customer-use-billing').disabled=false;
    for(const kind of ['pickup','delivery']){
      const select=document.getElementById('customer-'+kind+'-location'),locations=record[kind+'Locations'];
      select.innerHTML='<option value="">Select saved '+kind+' location</option>'+locations.map(location=>'<option value="'+esc(location.id)+'">'+esc([location.facility,location.street,location.city,location.state,location.zip].filter(Boolean).join(' - '))+'</option>').join('');
      if(locations.length===1){select.value=locations[0].id;fillAddress(kind,locations[0])}
    }
    document.getElementById('customer-load-duplicate').hidden=true;
  }
  function clearSelection(clearFields=false){
    const hadSelection=Boolean(selectedId);selectedId='';api.selectedId='';allowDuplicate=false;document.getElementById('customer-use-billing').disabled=true;
    for(const kind of ['pickup','delivery'])document.getElementById('customer-'+kind+'-location').innerHTML='<option value="">Select saved '+kind+' location</option>';
    if(clearFields&&hadSelection){
      for(const field of ['customer-type','customer-phone','customer-email','customer-contact','customer-terms','customer-notes'])document.getElementById(field).value='';
      document.getElementById('customer-test-record').checked=false;document.getElementById('billing-same-as-delivery').checked=false;
      for(const kind of ['billing','pickup','delivery'])fillAddress(kind,{});
    }
  }
  document.getElementById('customer-use-billing').addEventListener('click',()=>{const record=api.get(selectedId);if(record){document.getElementById('billing-same-as-delivery').checked=false;fillAddress('billing',record.billingAddress)}});
  for(const kind of ['pickup','delivery'])document.getElementById('customer-'+kind+'-location').addEventListener('change',event=>{const record=api.get(selectedId),location=record?.[kind+'Locations'].find(value=>value.id===event.target.value);if(location)fillAddress(kind,location)});
  const wrapper=document.createElement('div');wrapper.className='autocomplete';nameInput.parentNode.insertBefore(wrapper,nameInput);wrapper.appendChild(nameInput);
  const suggestions=document.createElement('div');suggestions.className='autocomplete-list';suggestions.id='customer-master-suggestions';suggestions.setAttribute('role','listbox');wrapper.appendChild(suggestions);
  nameInput.setAttribute('role','combobox');nameInput.setAttribute('aria-controls',suggestions.id);nameInput.setAttribute('aria-autocomplete','list');
  function showSuggestions(){
    const matches=api.search(nameInput.value).slice(0,12);suggestions.innerHTML='';
    matches.forEach(record=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.textContent=[record.name,record.billingAddress.city,record.email].filter(Boolean).join(' - ');button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>{selectCustomer(record.id);suggestions.classList.remove('show');nameInput.setAttribute('aria-expanded','false')});suggestions.appendChild(button)});
    suggestions.classList.toggle('show',matches.length>0);nameInput.setAttribute('aria-expanded',String(matches.length>0));
  }
  nameInput.addEventListener('focus',showSuggestions);
  nameInput.addEventListener('input',()=>{if(normalized(api.get(selectedId)?.name)!==normalized(nameInput.value))clearSelection(true);showSuggestions()});
  nameInput.addEventListener('change',()=>{if(selectedId)return;const matches=api.list().filter(record=>normalized(record.name)===normalized(nameInput.value));if(matches.length===1)selectCustomer(matches[0].id)});
  nameInput.addEventListener('blur',()=>setTimeout(()=>{suggestions.classList.remove('show');nameInput.setAttribute('aria-expanded','false')},150));
  nameInput.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();showSuggestions();suggestions.querySelector('button')?.focus()}if(event.key==='Escape'){suggestions.classList.remove('show');nameInput.setAttribute('aria-expanded','false')}});
  function intakeValue(){
    const value=field=>text(document.getElementById(field)?.value);
    return{name:value('customer-name'),type:value('customer-type'),billingAddress:Object.fromEntries(['street','city','state','zip'].map(part=>[part,value('billing-'+part)])),phone:value('customer-phone'),email:value('customer-email'),primaryContact:value('customer-contact'),terms:value('customer-terms'),notes:value('customer-notes'),isTest:document.getElementById('customer-test-record').checked};
  }
  function checkDuplicate(){
    if(selectedId||allowDuplicate)return false;
    const matches=api.duplicates(intakeValue());if(!matches.length)return false;
    duplicateWarning(document.getElementById('customer-load-duplicate'),matches,selectCustomer,()=>{allowDuplicate=true;loadForm.requestSubmit()});return true;
  }
  loadForm.addEventListener('submit',event=>{if(checkDuplicate()){event.preventDefault();event.stopImmediatePropagation()}},true);
  loadForm.addEventListener('reset',()=>setTimeout(()=>{clearSelection();document.getElementById('customer-load-duplicate').hidden=true;document.getElementById('customer-master-suggestions').classList.remove('show')},0));
  api.prepareLoad=()=>{
    if(checkDuplicate())return{ok:false};
    let record=selectedId?api.get(selectedId):null;
    if(!record){const result=api.save(intakeValue(),{allowDuplicate});if(!result.ok)return result;record=result.record;selectedId=record.id}
    for(const kind of ['pickup','delivery'])if(document.getElementById('customer-save-'+kind).checked){
      const location=Object.fromEntries(['facility','street','city','state','zip'].map(part=>[part,text(document.getElementById(kind+'-'+part)?.value)]));
      const result=api.addLocation(record.id,kind,location);if(!result.ok)return result;
    }
    const snapshot=api.snapshot(record.id),transaction=intakeValue();
    snapshot.billingAddress=address(transaction.billingAddress);
    for(const key of ['type','phone','email','primaryContact','terms','notes'])snapshot[key]=transaction[key]||snapshot[key];
    refreshMasterList();window.dispatchEvent(new Event('flt:customer-master-saved'));return{ok:true,customerId:record.id,snapshot};
  };
  api.selectCustomer=selectCustomer;api.openMaster=openMaster;refreshMasterList();
})();