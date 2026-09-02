(() => {
  const cacheKey = 'flt-us-zip-cache-v1';
  const fallback = { '28328': { city: 'Clinton', state: 'NC' } };
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

  function connect(zipId, cityId, stateId) {
    const zip = document.getElementById(zipId);
    const city = document.getElementById(cityId);
    const state = document.getElementById(stateId);
    if (!zip || !city || !state) return;

    const status = document.createElement('span');
    status.className = 'subtle zip-lookup-status';
    status.style.fontSize = '12px';
    status.setAttribute('aria-live', 'polite');
    zip.insertAdjacentElement('afterend', status);

    let requestNumber = 0;
    const update = async () => {
      const normalized = fiveDigitZip(zip.value);
      if (!normalized) {
        status.textContent = zip.value.trim() ? 'Enter a valid 5-digit ZIP code.' : '';
        return;
      }
      const currentRequest = ++requestNumber;
      status.textContent = 'Finding city and state…';
      const result = await findZip(normalized);
      if (currentRequest !== requestNumber || fiveDigitZip(zip.value) !== normalized) return;
      if (!result) {
        status.textContent = 'ZIP not found. Enter city and state manually.';
        return;
      }
      city.value = result.city;
      state.value = result.state.toUpperCase();
      city.dispatchEvent(new Event('input', { bubbles: true }));
      state.dispatchEvent(new Event('input', { bubbles: true }));
      status.textContent = `${result.city}, ${result.state} filled automatically.`;
    };

    zip.addEventListener('input', () => {
      zip.value = zip.value.replace(/[^\d-]/g, '').slice(0, 10);
      if (fiveDigitZip(zip.value)) update();
      else status.textContent = '';
    });
    zip.addEventListener('change', update);
    zip.addEventListener('blur', update);
  }

  connect('business-zip', 'business-city', 'business-state');
  connect('billing-zip', 'billing-city', 'billing-state');
  connect('pickup-zip', 'pickup-city', 'pickup-state');
  connect('delivery-zip', 'delivery-city', 'delivery-state');
})();
