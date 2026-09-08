(() => {
  const cacheKey='flt-us-zip-cache-v1';
  const addressBookKey='flt-address-book-v1';
  const fallback={'28328':{city:'Clinton',state:'NC'},'27601':{city:'Raleigh',state:'NC'}};
  let cache={};
  try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}')||{}}catch(error){cache={}}
  const saveCache=()=>{try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch(error){}};
  const fiveDigitZip=value=>{const match=String(value||'').trim().match(/^(\d{5})(?:-\d{4})?$/);return match?match[1]:''};
  async function findZip(zip){
    if(fallback[zip])return fallback[zip];
    if(cache[zip])return cache[zip];
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    try{
      const response=await fetch(`https://api.zippopotam.us/us/${zip}`,{signal:controller.signal});
      if(!response.ok)return null;
      const data=await response.json(),place=data?.places?.[0];
      if(!place)return null;
      const result={city:place['place name']||'',state:place['state abbreviation']||''};
      if(!result.city||!result.state)return null;
      cache[zip]=result;saveCache();return result;
    }catch(error){return null}finally{clearTimeout(timer)}
  }
  function readBook(){try{return JSON.parse(localStorage.getItem(addressBookKey)||'[]')||[]}catch(error){return[]}}
  function saveBook(book){try{localStorage.setItem(addressBookKey,JSON.stringify(book.slice(-100)))}catch(error){}}
  function normalizedAddress(item={},type='saved'){
    return{type,facility:String(item.facility||item.name||'').trim(),street:String(item.street||item.address||'').trim(),zip:String(item.zip||item.postalCode||'').trim(),city:String(item.city||'').trim(),state:String(item.state||'').trim().toUpperCase()};
  }
  function remember(address){
    const item=normalizedAddress(address,address.type||'saved');
    if(!item.street||!fiveDigitZip(item.zip)||!item.city||!item.state)return;
    const book=readBook(),key=[item.street,fiveDigitZip(item.zip),item.city,item.state].join('|').toLowerCase();
    const existing=book.findIndex(x=>[x.street,fiveDigitZip(x.zip),x.city,x.state].join('|').toLowerCase()===key);
    if(existing>=0)book.splice(existing,1);
    book.push({...item,zip:fiveDigitZip(item.zip),savedAt:new Date().toISOString()});saveBook(book);
  }
  function loadHistory(){
    let loads=[];try{loads=JSON.parse(localStorage.getItem('flt-v32-loads')||'[]')||[]}catch(error){loads=[]}
    const items=[];
    loads.forEach(load=>['billing','pickup','delivery'].forEach(type=>{
      const raw=type==='billing'?(load.billingAddress||load.customerAddress||{}):(load[type+'Address']||{});
      const item=normalizedAddress(raw,type);if(item.street&&fiveDigitZip(item.zip)&&item.city&&item.state)items.push(item);
    }));
    return items;
  }
  function savedAddresses(type,zip){
    const all=[...readBook(),...loadHistory()].map(item=>normalizedAddress(item,item.type||'saved'));
    const seen=new Set(),matches=[];
    all.forEach(item=>{
      if(fiveDigitZip(item.zip)!==zip||!item.street)return;
      const key=[item.street,zip,item.city,item.state].join('|').toLowerCase();if(seen.has(key))return;seen.add(key);matches.push(item);
    });
    return matches.sort((a,b)=>Number(b.type===type)-Number(a.type===type));
  }
  function rememberFromForm(type){
    const prefix=type+'-';
    const facility=document.getElementById(prefix+'facility');
    const street=document.getElementById(prefix+'street');
    const zip=document.getElementById(prefix+'zip');
    const city=document.getElementById(prefix+'city');
    const state=document.getElementById(prefix+'state');
    if(!street||!zip||!city||!state)return;
    remember({type,facility:facility?.value||'',street:street.value,zip:zip.value,city:city.value,state:state.value});
  }
  function connect(zipId,cityId,stateId,type){
    const zip=document.getElementById(zipId),city=document.getElementById(cityId),state=document.getElementById(stateId);if(!zip||!city||!state)return;
    const status=document.createElement('span');status.className='subtle zip-lookup-status';status.style.fontSize='12px';status.setAttribute('aria-live','polite');zip.insertAdjacentElement('afterend',status);
    const suggestions=document.createElement('div');suggestions.className='autocomplete-list zip-address-suggestions';suggestions.setAttribute('role','listbox');Object.assign(suggestions.style,{display:'none',position:'absolute',zIndex:'30',left:'0',right:'0',background:'#fff',border:'1px solid #d8ddd6',borderRadius:'8px',padding:'6px',boxShadow:'0 8px 24px rgba(0,0,0,.12)',maxHeight:'220px',overflowY:'auto'});zip.parentElement.style.position='relative';zip.parentElement.appendChild(suggestions);
    const hideSuggestions=()=>{suggestions.style.display='none'};
    const renderSuggestions=normalized=>{
      const matches=savedAddresses(type,normalized);suggestions.innerHTML='';
      matches.forEach(address=>{
        const button=document.createElement('button');button.type='button';button.style.cssText='display:block;width:100%;text-align:left;border:0;background:#fff;padding:9px 10px;border-radius:6px;cursor:pointer';
        const label=[address.facility,address.street,address.city+', '+address.state,address.zip].filter(Boolean).join(' · ');button.textContent=(address.type===type?'Recent '+type+': ':'Saved address: ')+label;
        button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>{
          const prefix=type+'-',facility=document.getElementById(prefix+'facility'),street=document.getElementById(prefix+'street');
          if(facility&&address.facility)facility.value=address.facility;if(street)street.value=address.street;zip.value=fiveDigitZip(address.zip);city.value=address.city;state.value=address.state;
          [facility,street,zip,city,state].filter(Boolean).forEach(control=>control.dispatchEvent(new Event('change',{bubbles:true})));
          remember({...address,type});status.textContent='Saved address selected: '+address.city+', '+address.state+'.';hideSuggestions();
        });suggestions.appendChild(button);
      });suggestions.style.display=matches.length?'block':'none';
    };
    let requestNumber=0;
    const update=async()=>{
      const normalized=fiveDigitZip(zip.value);if(!normalized){status.textContent=zip.value.trim()?'Enter a valid 5-digit ZIP code.':'';hideSuggestions();return}
      const currentRequest=++requestNumber;status.textContent='Finding city and state…';const result=await findZip(normalized);if(currentRequest!==requestNumber||fiveDigitZip(zip.value)!==normalized)return;
      if(!result){status.textContent='ZIP not found. Enter city and state manually.';renderSuggestions(normalized);return}
      city.value=result.city;state.value=result.state.toUpperCase();city.dispatchEvent(new Event('change',{bubbles:true}));state.dispatchEvent(new Event('change',{bubbles:true}));zip.dispatchEvent(new CustomEvent('flt:zip-resolved',{bubbles:true,detail:{zip:normalized,city:result.city,state:result.state.toUpperCase()}}));status.textContent=`${result.city}, ${result.state} filled automatically.`;rememberFromForm(type);renderSuggestions(normalized);
    };
    zip.addEventListener('input',()=>{zip.value=zip.value.replace(/[^\d-]/g,'').slice(0,10);if(fiveDigitZip(zip.value))update();else{status.textContent=zip.value?'Enter a valid 5-digit ZIP code.':'';hideSuggestions()}});
    zip.addEventListener('change',()=>{update();rememberFromForm(type)});zip.addEventListener('blur',()=>{update();rememberFromForm(type);setTimeout(hideSuggestions,220)});zip.addEventListener('focus',()=>{const normalized=fiveDigitZip(zip.value);if(normalized)renderSuggestions(normalized)});
    const prefix=type+'-';['facility','street','city','state'].forEach(part=>document.getElementById(prefix+part)?.addEventListener('change',()=>rememberFromForm(type)));
  }
  connect('business-zip','business-city','business-state','business');
  connect('billing-zip','billing-city','billing-state','billing');
  connect('pickup-zip','pickup-city','pickup-state','pickup');
  connect('delivery-zip','delivery-city','delivery-state','delivery');
})();
