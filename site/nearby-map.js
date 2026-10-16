/* Map UI for the existing, separately attributed IM3 location layer. */
(() => {
  'use strict';
  const assetBase = new URL('.', document.currentScript.src);
  let library;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function loadLibrary() {
    if (window.L) return Promise.resolve(window.L);
    if (!library) library = new Promise((resolve, reject) => {
      const css = el('link');
      css.rel = 'stylesheet'; css.href = new URL('vendor/leaflet/leaflet.css', assetBase);
      document.head.append(css);
      const script = el('script');
      script.src = new URL('vendor/leaflet/leaflet.js', assetBase);
      script.onload = () => resolve(window.L);
      script.onerror = () => { library = null; script.remove(); reject(Error('Map library unavailable')); };
      document.head.append(script);
    });
    return library;
  }
  function link(text, href) {
    const a = el('a', text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  async function create({ mount, place }) {
    mount.textContent = 'Loading interactive map…';
    const L = await loadLibrary();
    if (!mount.isConnected) return null;
    mount.replaceChildren();
    const home = [Number(place.latitude), Number(place.longitude)];
    const card = el('section', undefined, 'nearby-map-card');
    card.setAttribute('aria-label', 'Nearby data-center map');
    const toolbar = el('div', undefined, 'nearby-map-toolbar');
    const heading = el('h3', 'Put the footprint on the map.');
    const controls = el('div', undefined, 'nearby-map-actions');
    const reset = el('button', '⌖ ZIP area', 'btn'); reset.type = 'button';
    reset.setAttribute('aria-label', 'Return to ZIP area and show all results');
    const expand = el('button', '⛶ Expand map', 'btn'); expand.type = 'button';
    expand.setAttribute('aria-haspopup', 'dialog');
    controls.append(reset, expand); toolbar.append(heading, controls);
    const canvas = el('div', undefined, 'nearby-map-canvas');
    canvas.setAttribute('role', 'region'); canvas.setAttribute('aria-label', 'Map of nearby data-center records. Use arrow keys to pan and plus or minus to zoom.');
    const note = el('p', 'Blue pins mark facilities; red marks your selection. Yellow marks the ZIP reference point. Pins show locations, not pollution levels.', 'nearby-map-key');
    const tileStatus = el('p', '', 'nearby-map-tile-status'); tileStatus.hidden = true; tileStatus.setAttribute('role', 'status');
    const profile = el('article', undefined, 'nearby-map-profile');
    profile.tabIndex = -1; profile.setAttribute('aria-live', 'polite');
    profile.append(el('h3', 'Choose a pin or a record below.'), el('p', 'See the operator, source location and what is still unknown.'));
    card.append(toolbar, canvas, note, tileStatus, profile); mount.append(card);
    const map = L.map(canvas, { scrollWheelZoom: false, zoomControl: false, minZoom: 3 }).setView(home, 10);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: true, metric: true }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, updateWhenIdle: true, keepBuffer: 1,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).on('tileerror', () => {
      tileStatus.hidden = false;
      tileStatus.textContent = 'Some street-map tiles could not load. Location pins and the record list remain available.';
    }).addTo(map);
    L.circleMarker(home, { radius: 9, color: '#25231f', weight: 2, fillColor: '#efc53c', fillOpacity: 1 })
      .addTo(map).bindTooltip('ZIP reference point — not your home');
    const group = L.layerGroup().addTo(map);
    let rows = [], radius = 50, selectedMarker = null, destroyed = false;
    const markers = new Map();
    const dialog = el('dialog', undefined, 'nearby-map-dialog');
    dialog.setAttribute('aria-label', 'Expanded nearby data-center map'); document.body.append(dialog);
    function resize() { if (!destroyed) requestAnimationFrame(() => { if (!destroyed) { map.invalidateSize({ pan: true, animate: false }); selectedMarker?.getPopup()?.update(); } }); }
    function closeExpanded() { if (dialog.open) dialog.close(); }
    window.addEventListener('footprint:opentour', closeExpanded);
    expand.onclick = () => {
      if (dialog.open) { closeExpanded(); return; }
      dialog.append(card); expand.textContent = '✕ Close map'; dialog.showModal(); resize(); expand.focus();
    };
    dialog.addEventListener('close', () => {
      if (destroyed) return;
      mount.append(card); expand.textContent = '⛶ Expand map'; resize(); expand.focus({ preventScroll: true });
    });
    function showProfile(row, siblings) {
      const p = row.feature.properties, [lon, lat] = row.feature.geometry.coordinates;
      profile.replaceChildren(el('div', 'Mapped location · source record', 'eyebrow'), el('h3', window.FacilityAddresses.name(row.feature)));
      if (siblings.length > 1) {
        const label = el('label', 'Overlapping records at this point');
        const select = el('select');
        select.setAttribute('aria-label', 'Choose an overlapping location record');
        for (const sibling of siblings) {
          const option = el('option', window.FacilityAddresses.name(sibling.feature));
          option.value = sibling.index; option.selected = sibling.index === row.index; select.append(option);
        }
        select.onchange = () => choose(Number(select.value), false);
        label.append(select); profile.append(label);
      }
      profile.append(el('p', (p.address?.operator || p.operator || 'Operator not provided') + ' · ' + (p.county || 'County not provided') + (p.state_abb ? ', ' + p.state_abb : '')));
      profile.append(el('p', '≈ ' + Math.round(row.distance) + ' miles from the ZIP reference point', 'nearby-map-distance'));
      window.FacilityAddresses.append(profile, row.feature);
      profile.append(el('p', 'Phase: existing in the source. Current operation not independently verified.', 'nearby-map-phase'));
      const details = el('details'); details.append(el('summary', 'Location & evidence limits'));
      details.append(el('p', 'The original IM3 layer supplies a ' + (p.type || 'source') + ' representative point: ' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '. Buildings and campuses may overlap.'));
      details.append(el('p', 'No facility-specific air-quality reading or emissions inventory is attached to this location record. Distance alone does not establish exposure.'));
      details.append(link('IM3 dataset and provenance ↗', 'https://doi.org/10.57931/3017294'));
      const actions = el('div', undefined, 'nearby-map-profile-actions');
      actions.append(link('Inspect location ↗', 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=17/' + lat + '/' + lon));
      const health = el('button', 'Find air-quality evidence ↗', 'btn'); health.type = 'button'; health.dataset.view = 'health'; health.onclick = closeExpanded;
      actions.append(health); profile.append(details, actions);
    }
    function choose(index, zoom = true) {
      const entry = markers.get(index); if (!entry) return;
      const row = entry.rows.find(r => r.index === index);
      selectedMarker?.getElement()?.classList.remove('is-selected');
      selectedMarker = entry.marker; selectedMarker.getElement()?.classList.add('is-selected');
      showProfile(row, entry.rows);
      if (zoom) map.setView(entry.marker.getLatLng(), Math.max(map.getZoom(), 13), { animate: false });
      entry.marker.openPopup();
    }
    function fit() {
      const bounds = L.latLngBounds([home, ...rows.map(r => [r.feature.geometry.coordinates[1], r.feature.geometry.coordinates[0]])]);
      if (rows.length) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12, animate: false });
      else map.fitBounds(L.latLng(home).toBounds(radius * 3218.688), { animate: false });
    }
    reset.onclick = () => { map.closePopup(); fit(); };
    function setRows(nextRows, nextRadius) {
      if (destroyed) return;
      rows = nextRows; radius = nextRadius; markers.clear(); group.clearLayers(); selectedMarker = null;
      profile.replaceChildren(el('h3', rows.length ? 'Choose a pin or a record below.' : 'No mapped records in this radius.'), el('p', rows.length ? 'See the operator, source location and what is still unknown.' : 'This is an incomplete dataset. Try a larger radius or review state filings.'));
      const byPoint = new Map();
      for (const row of rows) {
        const key = row.feature.geometry.coordinates.map(n => n.toFixed(6)).join(',');
        if (!byPoint.has(key)) byPoint.set(key, []); byPoint.get(key).push(row);
      }
      for (const siblings of byPoint.values()) {
        const row = siblings[0], p = row.feature.properties, [lon, lat] = row.feature.geometry.coordinates;
        const name = window.FacilityAddresses.name(row.feature);
        const title = siblings.length > 1 ? siblings.length + ' overlapping location records' : name;
        const symbol = siblings.length > 1 ? '<b>' + siblings.length + '</b>' : '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M5 26V3h14v23M1 26h22" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M9 8h2m3 0h2M9 13h2m3 0h2M9 18h2m3 0h2" stroke="currentColor" stroke-width="2.5"/></svg>';
        const icon = L.divIcon({ className: 'footprint-map-pin', html: '<span>' + symbol + '</span>', iconSize: [44, 48], iconAnchor: [22, 44], popupAnchor: [0, -38] });
        const marker = L.marker([lat, lon], { icon, title, alt: title, keyboard: true, riseOnHover: true }).addTo(group);
        const popup = el('div', undefined, 'nearby-pin-popup'); popup.append(el('strong', title));
        const inspect = el('button', 'Facility details ↓'); inspect.type = 'button';
        inspect.onclick = () => { profile.focus({ preventScroll: true }); profile.scrollIntoView({ block: 'nearest' }); };
        popup.append(inspect); marker.bindPopup(popup, { maxWidth: 230, autoPanPadding: [20, 20] });
        marker.on('click', () => choose(row.index, false));
        for (const sibling of siblings) markers.set(sibling.index, { marker, rows: siblings });
      }
      fit();
    }
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const onView = () => { if (document.body.dataset.view !== 'ledger') closeExpanded(); else resize(); };
    window.addEventListener('footprint:viewchange', onView);
    return {
      setRows,
      select(index) { choose(index); card.scrollIntoView({ block: 'start' }); },
      destroy() { destroyed = true; observer.disconnect(); window.removeEventListener('footprint:viewchange', onView); window.removeEventListener('footprint:opentour', closeExpanded); dialog.close(); dialog.remove(); map.remove(); }
    };
  }
  window.NearbyMap = { create, loadLibrary };
})();
