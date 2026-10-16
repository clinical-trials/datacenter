/* Public facility addresses, with separate provenance from IM3 map geometry. */
(() => {
  'use strict';
  let addressData;
  const make = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const publicLink = (label, url) => {
    const a = make('a', label);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  };
  const label = record => record.verification === 'operator-facility' ? 'Operator facility page' : record.verification === 'operator-contact' ? 'Operator contact address' : 'Community-mapped · confirm before travel';
  const name = feature => feature.properties.address?.name || feature.properties.name || feature.properties.operator || 'Unnamed mapped data-center record';
  const fullAddress = record => [record.street, record.city, [record.state, record.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  async function enrich(features) {
    try {
      if (!addressData) addressData = fetch('nearby-addresses.json?v=20261012').then(r => {
        if (!r.ok) throw Error('Address supplement unavailable'); return r.json();
      }).catch(error => { addressData = null; throw error; });
      const data = await addressData;
      const byIndex = new Map(data.records.map(r => [r.location_index, r]));
      const enriched = features.map((feature, index) => {
        const record = byIndex.get(index), p = feature.properties;
        if (!record || record.match.name !== p.name || record.match.state_abb !== p.state_abb || JSON.stringify(record.match.coordinates) !== JSON.stringify(feature.geometry.coordinates)) return feature;
        return { ...feature, properties: { ...p, address: record } };
      });
      return { features: enriched, count: enriched.filter(f => f.properties.address).length, retrieved: data.retrieved, available: true };
    } catch {
      return { features, count: 0, available: false };
    }
  }
  function append(container, feature, { compact = false } = {}) {
    const record = feature.properties.address;
    if (!record) { container.append(make('p', 'Street address not yet verified for this record.', 'nearby-address-missing')); return; }
    const block = make('div', undefined, 'nearby-address');
    block.append(make('div', label(record), 'nearby-address-badge'), make('p', fullAddress(record), 'nearby-street-address'));
    const citation = make('p', undefined, 'nearby-address-source');
    citation.append(publicLink('Address source ↗', record.source_url), document.createTextNode(' · Checked '), make('span', record.checked_on, 'nearby-address-date'));
    block.append(citation);
    if (record.address_note) block.append(make('p', record.address_note, 'small'));
    if (!record.city) block.append(make('p', 'City not supplied in this address record; confirm the source location.', 'small'));
    const actions = make('div', undefined, 'nearby-address-actions');
    actions.append(publicLink('Directions ↗', 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(fullAddress(record))));
    const copy = make('button', 'Copy address', 'btn'); copy.type = 'button';
    const feedback = make('span', '', 'small'); feedback.setAttribute('role', 'status');
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(fullAddress(record)); feedback.textContent = 'Address copied.'; }
      catch { feedback.textContent = 'Select and copy the address above.'; }
    };
    actions.append(copy);
    const tour = make('button', 'Add to my tour +', 'btn'); tour.type = 'button';
    tour.onclick = async () => {
      if (!window.CommunityTours) { feedback.textContent = 'The tour builder is still loading. Try again.'; return; }
      tour.disabled = true;
      try {
        feedback.textContent = await window.CommunityTours.add({ name: name(feature), address: fullAddress(record), source: record.source_url, verification: label(record), checked: record.checked_on, phase: 'Existing in mapped source; current operation not independently verified' });
      } finally { tour.disabled = false; }
    };
    const openTour = make('button', 'View my tour →', 'btn'); openTour.type = 'button';
    openTour.onclick = () => { window.dispatchEvent(new Event('footprint:opentour')); view('tours'); };
    actions.append(tour, openTour);
    if (!compact && record.visit_url) actions.append(publicLink(record.visit_label, record.visit_url));
    block.append(actions, feedback);
    if (!compact) block.append(make('p', 'View from public streets where permitted. A listed address is not permission to enter; arrange any tour with the operator. Pins may mark a building center, not an entrance.', 'nearby-visit-note'));
    container.append(block);
  }
  window.FacilityAddresses = { enrich, append, name };
})();
