(() => {
  'use strict';
  if (window.FLTDispatchControlPage) return;

  const viewId = 'dispatch-control';
  const loadSelectId = 'fleet-lock-load';

  function navButton() {
    const nav = document.getElementById('nav');
    if (!nav) return null;
    let button = nav.querySelector('[data-view="' + viewId + '"]');
    if (button) return button;

    button = document.createElement('button');
    button.type = 'button';
    button.dataset.view = viewId;
    button.innerHTML = '<span class="nav-icon">⇄</span><span class="nav-label">Dispatch Control</span>';

    const fleet = nav.querySelector('[data-view="fleet"]');
    if (fleet) fleet.insertAdjacentElement('afterend', button);
    else nav.appendChild(button);
    return button;
  }

  function view() {
    let host = document.getElementById(viewId);
    if (host) return host;
    const main = document.querySelector('main');
    if (!main) return null;

    host = document.createElement('section');
    host.id = viewId;
    host.className = 'view';
    host.innerHTML = `
      <div class="topbar">
        <div>
          <div class="eyebrow">Family Legacy Commercial Command™ / V3.8</div>
          <h1>Dispatch Control.</h1>
          <p class="subtle">Fleet operations assigns verified people and equipment to accepted loads.</p>
        </div>
      </div>
      <div class="panel" id="v38-dispatch-control-status-panel" style="margin-bottom:14px">
        <div class="section-head">
          <div>
            <div class="eyebrow">Fleet operations</div>
            <h2 id="v38-dispatch-control-status-title">Dispatch Control — no evaluation required</h2>
            <p class="subtle" id="v38-dispatch-control-status-copy" style="margin-top:5px">No open accepted load is waiting for dispatch.</p>
          </div>
          <span class="tag gray" id="v38-dispatch-control-status-tag">NO EVALUATION REQUIRED</span>
        </div>
      </div>
      <div id="v38-dispatch-control-body"></div>`;
    main.appendChild(host);
    return host;
  }

  function dispatchPanel() {
    return document.getElementById('fleet-lock-form')?.closest('.panel') || null;
  }

  function moveDispatchContent() {
    const host = view();
    const body = host?.querySelector('#v38-dispatch-control-body');
    const primary = dispatchPanel();
    if (!body || !primary) return false;

    const ids = [
      'v38-assignment-history',
      'v38-weight-fit-panel',
      'v38-document-compliance-panel'
    ];

    if (primary.parentElement !== body) body.appendChild(primary);
    ids.forEach(id => {
      const panel = document.getElementById(id);
      if (panel && panel.parentElement !== body) body.appendChild(panel);
    });
    return true;
  }

  function openAcceptedLoads() {
    const select = document.getElementById(loadSelectId);
    if (!select) return [];
    return [...select.options]
      .filter(option => option.value && !/no open accepted loads/i.test(option.textContent || ''))
      .map(option => option.value);
  }

  function renderStatus() {
    const select = document.getElementById(loadSelectId);
    const title = document.getElementById('v38-dispatch-control-status-title');
    const copy = document.getElementById('v38-dispatch-control-status-copy');
    const tag = document.getElementById('v38-dispatch-control-status-tag');
    if (!title || !copy || !tag) return;

    const openLoads = openAcceptedLoads();
    const selected = select?.value || '';
    if (!openLoads.length) {
      title.textContent = 'Dispatch Control — no evaluation required';
      copy.textContent = 'No open accepted load is waiting for dispatch. Fleet records remain available in Drivers & Equipment.';
      tag.textContent = 'NO EVALUATION REQUIRED';
      tag.className = 'tag gray';
      return;
    }

    title.textContent = 'Dispatch Control — evaluation required';
    copy.textContent = selected
      ? selected + ' is ready for fleet assignment, equipment-fit, and compliance review.'
      : openLoads.length + ' open accepted load' + (openLoads.length === 1 ? ' is' : 's are') + ' waiting for dispatch.';
    tag.textContent = 'EVALUATION REQUIRED';
    tag.className = 'tag orange';
  }

  function removeFleetDispatchGap() {
    const fleetView = document.getElementById('fleet');
    const panel = dispatchPanel();
    if (!fleetView || !panel) return;
    // The dispatch panel is intentionally moved out of Drivers & Equipment.
    // Reusable driver/truck/trailer records and My Regular Rig stay in fleet.
  }

  function apply() {
    navButton();
    view();
    moveDispatchContent();
    removeFleetDispatchGap();
    renderStatus();

    const select = document.getElementById(loadSelectId);
    if (select && select.dataset.fltDispatchPageHook !== '1') {
      select.dataset.fltDispatchPageHook = '1';
      select.addEventListener('change', renderStatus);
      new MutationObserver(() => renderStatus()).observe(select, { childList: true, subtree: true });
    }
  }

  document.getElementById('nav')?.addEventListener('click', event => {
    const button = event.target.closest('[data-view="' + viewId + '"]');
    if (button) setTimeout(() => {
      moveDispatchContent();
      renderStatus();
      window.FLTAssignmentUI?.autoSelectCurrentLoad?.(false);
      window.FLTAssignmentUI?.render?.();
      window.FLTWeightEquipmentUI?.render?.();
      window.FLTDocumentComplianceUI?.render?.();
      moveDispatchContent();
    }, 0);
  }, true);

  window.addEventListener('flt:modules-loaded', () => setTimeout(apply, 0));
  apply();
  window.FLTDispatchControlPage = { apply, renderStatus, moveDispatchContent };
})();
