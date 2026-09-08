(() => {
  const cacheKey = 'flt-us-zip-cache-v1';
  const fallback = { '28328': { city: 'Clinton', state: 'NC' }, '27601': { city: 'Raleigh', state: 'NC' } };
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}') || {}; } catch (error) { cache = {}; }

  const saveCache = () => {
    try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch (error) {}
  };

  const fiveDigitZip = value => {
    const match = String(value || '').trim().match(/^(\d{5})(?:-\d{4})?$/);
    return match ? match[1] : '';
  };

  async function findZip(zip) {
    if (fallback[zip]) return fallback[zip];
    if (cache[zip]) return cache[zip];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: controller.signal });
      if (!response.ok) return null;
      const data = await response.json();
      const place = data?.places?.[0];
      if (!place) return null;
      const result = { city: place['place name'] || '', state: place['state abbreviation'] || '' };
      if (!result.city || !result.state) return null;
      cache[zip] = result;
      saveCache();
      return result;
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function savedAddresses(type, zip) {
    if (!type || !zip) return [];
    let loads = [];
    try { loads = JSON.parse(localStorage.getItem('flt-v32-loads') || '[]') || []; } catch (error) { loads = []; }
    const seen = new Set(), matches = [];
    loads.slice().reverse().forEach(load => {
      const address = load?.[type + 'Address'] || {};
      if (fiveDigitZip(address.zip) !== zip) return;
      const item = { facility:String(address.facility || '').trim(), street:String(address.street || '').trim(), zip:String(address.zip || '').trim(), city:String(address.city || '').trim(), state:String(address.state || '').trim().toUpperCase() };
      const key = [item.facility,item.street,item.zip,item.city,item.state].join('|').toLowerCase();
      if (!item.street || seen.has(key)) return;
      seen.add(key); matches.push(item);
    });
    return matches;
  }

  function connect(zipId, cityId, stateId, type) {
    const zip = document.getElementById(zipId);
    const city = document.getElementById(cityId);
    const state = document.getElementById(stateId);
    if (!zip || !city || !state) return;

    const status = document.createElement('span');
    status.className = 'subtle zip-lookup-status';
    status.style.fontSize = '12px';
    status.setAttribute('aria-live', 'polite');
    zip.insertAdjacentElement('afterend', status);

    const suggestions = document.createElement('div');
    suggestions.className = 'autocomplete-list zip-address-suggestions';
    suggestions.setAttribute('role', 'listbox');
    zip.parentElement.style.position = 'relative';
    zip.parentElement.appendChild(suggestions);

    const hideSuggestions = () => suggestions.classList.remove('show');
    const renderSuggestions = normalized => {
      const matches = savedAddresses(type, normalized);
      suggestions.innerHTML = '';
      matches.forEach(address => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = [address.facility,address.street,address.city + ', ' + address.state,address.zip].filter(Boolean).join(' · ');
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => {
          const prefix = type + '-';
          const facility = document.getElementById(prefix + 'facility');
          const street = document.getElementById(prefix + 'street');
          if (facility && address.facility) facility.value = address.facility;
          if (street) street.value = address.street;
          zip.value = address.zip;
          city.value = address.city;
          state.value = address.state;
          [facility,street,zip,city,state].filter(Boolean).forEach(control => control.dispatchEvent(new Event('change', { bubbles:true })));
          status.textContent = 'Saved address selected: ' + address.city + ', ' + address.state + '.';
          hideSuggestions();
        });
        suggestions.appendChild(button);
      });
      suggestions.classList.toggle('show', matches.length > 0);
    };

    let requestNumber = 0;
    const update = async () => {
      const normalized = fiveDigitZip(zip.value);
      if (!normalized) {
        status.textContent = zip.value.trim() ? 'Enter a valid 5-digit ZIP code.' : '';
        hideSuggestions();
        return;
      }
      const currentRequest = ++requestNumber;
      status.textContent = 'Finding city and state…';
      const result = await findZip(normalized);
      if (currentRequest !== requestNumber || fiveDigitZip(zip.value) !== normalized) return;
      if (!result) {
        status.textContent = 'ZIP not found. Enter city and state manually.';
        renderSuggestions(normalized);
        return;
      }
      city.value = result.city;
      state.value = result.state.toUpperCase();
      city.dispatchEvent(new Event('change', { bubbles: true }));
      state.dispatchEvent(new Event('change', { bubbles: true }));
      zip.dispatchEvent(new CustomEvent('flt:zip-resolved', { bubbles:true, detail:{ zip:normalized, city:result.city, state:result.state.toUpperCase() } }));
      status.textContent = `${result.city}, ${result.state} filled automatically.`;
      renderSuggestions(normalized);
    };

    zip.addEventListener('input', () => {
      zip.value = zip.value.replace(/[^\d-]/g, '').slice(0, 10);
      if (fiveDigitZip(zip.value)) update();
      else { status.textContent = zip.value ? 'Enter a valid 5-digit ZIP code.' : ''; hideSuggestions(); }
    });
    zip.addEventListener('change', update);
    zip.addEventListener('blur', () => { update(); setTimeout(hideSuggestions, 180); });
    zip.addEventListener('focus', () => { const normalized=fiveDigitZip(zip.value); if(normalized) renderSuggestions(normalized); });
  }

  connect('business-zip', 'business-city', 'business-state', 'business');
  connect('billing-zip', 'billing-city', 'billing-state', 'billing');
  connect('pickup-zip', 'pickup-city', 'pickup-state', 'pickup');
  connect('delivery-zip', 'delivery-city', 'delivery-state', 'delivery');
})();
