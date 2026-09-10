(() => {
  'use strict';
  if (window.FLTOwnerOperatorDispatchHardfix) return;

  const ownerReason = 'Owner-operator self-dispatch';

  function addOwnerOperatorReason() {
    const api = window.FLTAssignmentIntegrity;
    if (!api?.reasons?.assign) return;
    if (!api.reasons.assign.includes(ownerReason)) api.reasons.assign.unshift(ownerReason);
  }

  function relabelDispatchControl() {
    const form = document.getElementById('fleet-lock-form');
    if (!form) return;

    const heading = form.closest('.panel')?.querySelector('h2');
    if (heading && /Driver.*Truck.*Trailer.*Trip Lock/i.test(heading.textContent || '')) {
      heading.textContent = 'Driver / Owner-Operator – Truck – Trailer Trip Lock';
    }

    const driver = document.getElementById('fleet-lock-driver');
    const driverLabel = driver?.closest('.field')?.querySelector('label');
    if (driverLabel) driverLabel.textContent = 'Driver / Owner-Operator';

    let note = document.getElementById('v38-owner-operator-dispatch-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'v38-owner-operator-dispatch-note';
      note.className = 'notice';
      note.style.marginBottom = '12px';
      note.innerHTML = '<strong>Owner-operator / self-dispatch supported.</strong><br><span class="subtle">Use the same verified driver record for the owner-operator. Choose “Owner-operator self-dispatch” as the assignment reason. No duplicate driver record is required.</span>';
      form.insertAdjacentElement('beforebegin', note);
    }

    const reason = document.getElementById('fleet-lock-reason');
    if (reason && ![...reason.options].some(option => option.value === ownerReason)) {
      const option = document.createElement('option');
      option.value = ownerReason;
      option.textContent = ownerReason;
      if (reason.options.length > 1) reason.insertBefore(option, reason.options[1]);
      else reason.appendChild(option);
    }
  }

  function apply() {
    addOwnerOperatorReason();
    relabelDispatchControl();
  }

  window.addEventListener('flt:modules-loaded', () => setTimeout(apply, 0));
  document.getElementById('nav')?.addEventListener('click', event => {
    if (event.target.closest('[data-view="fleet"],[data-view-jump="fleet"]')) setTimeout(apply, 80);
  }, true);

  apply();
  window.FLTOwnerOperatorDispatchHardfix = { apply, ownerReason };
})();
