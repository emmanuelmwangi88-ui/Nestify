'use strict';
/* Nestify marketplace: browse, filter, enquire, book and review. */

const PROP_SELECT = '*, property_media(id,kind,public_url,alt_text,sort_order), property_reviews(id,rating,reviewer_name,title,body,owner_response,created_at)';
const REVIEW_COLS = 'id,rating,reviewer_name,title,body,owner_response,created_at';
const BUDGETS = {
  rent: [30000, 60000, 100000, 200000, 500000],
  stay: [10000, 20000, 30000, 50000]
};
const CHIP_AMENITIES = ['Furnished', 'Parking', 'Pet friendly', 'Swimming pool', 'Wi-Fi / fibre', '24-hour security', 'Garden', 'Generator'];
const REPORT_REASONS = [
  ['fraud', 'Looks like a scam'], ['unavailable', 'No longer available'], ['incorrect_price', 'Price is wrong'],
  ['wrong_location', 'Location is wrong'], ['misleading_media', 'Photos are misleading'], ['duplicate', 'Duplicate listing'],
  ['unsafe', 'Unsafe property'], ['other', 'Something else']
];

const S = {
  live: [], demos: [], error: false,
  mode: 'rent', sort: 'featured', view: 'grid', limit: 9,
  f: { q: '', county: '', type: '', budget: '', beds: '', guests: '', checkin: '', checkout: '', amenities: new Set() },
  ranges: {},
  saved: new Set(readLS('nestify_saved').map(String)),
  compare: new Set(readLS('nestify_compare').map(String)),
  recent: readLS('nestify_recent').map(String),
  support: { email: 'hello@nestify.co.ke', phone: '' },
  lastFocus: null
};

const allProps = () => [...S.live, ...S.demos];
const findProp = id => allProps().find(p => String(p.id) === String(id));
const priceOf = p => Number(p.kind === 'stay' ? p.nightly_price : p.monthly_price) || 0;
const images = p => (p.media || []).filter(m => (m.kind || 'image') === 'image');
const cover = p => (images(p)[0] || {}).public_url || '';
const ratingOf = p => {
  const r = p.property_reviews || [];
  return r.length ? { avg: r.reduce((a, x) => a + Number(x.rating), 0) / r.length, n: r.length } : null;
};

/* ---------- Loading ---------- */
function normalize(p) {
  const media = (p.property_media || p.media || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const reviews = (p.property_reviews || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { ...p, media, property_reviews: reviews, tier: Number(p.tier) || 0, updated_at: p.updated_at || p.created_at };
}

async function loadProperties() {
  $('#grid').innerHTML = '<div class="skeleton"></div>'.repeat(3);
  S.error = false;
  if (!LIVE) {
    S.error = true;
  } else {
    const { data, error } = await db.from('properties').select(PROP_SELECT).eq('status', 'published')
      .order('tier', { ascending: false }).order('updated_at', { ascending: false }).limit(500);
    if (error) { console.error(error); S.error = true; } else S.live = data.map(normalize);
  }
  S.demos = (typeof DEMO_PROPERTIES !== 'undefined' ? DEMO_PROPERTIES : []).map(p => ({ ...p, property_reviews: [], tier: 0 }));
  await loadRanges();
  updateStats();
  render();
  renderRecent();
  renderCompareBar();
  const deep = new URLSearchParams(location.search).get('property');
  if (deep && findProp(deep)) openProperty(deep, true);
}

async function loadRanges() {
  S.ranges = {};
  const ids = S.live.filter(p => p.kind === 'stay').map(p => p.id);
  if (!LIVE || !ids.length) return;
  const { data, error } = await db.rpc('unavailable_ranges', { p_ids: ids });
  if (error) { console.error(error); return; }
  (data || []).forEach(r => { (S.ranges[r.property_id] ||= []).push({ s: r.start_date, e: r.end_date }); });
}

async function loadSettings() {
  if (!LIVE) return;
  const { data } = await db.from('platform_settings').select('key,value').in('key', ['support_contact', 'marketplace_status']);
  (data || []).forEach(row => {
    if (row.key === 'support_contact') {
      S.support = { ...S.support, ...Object.fromEntries(Object.entries(row.value || {}).filter(([, v]) => v)) };
      const a = $('#footerMail');
      if (a) { a.href = 'mailto:' + S.support.email; a.textContent = S.support.email; }
      const w = $('#footerWa');
      if (w && S.support.phone) { w.href = waLink(S.support.phone, 'Hello Nestify, I need help with '); w.hidden = false; }
    }
    if (row.key === 'marketplace_status' && row.value && row.value.maintenance) {
      const n = $('#notice');
      n.textContent = 'Nestify is under short maintenance. You can browse, but enquiries may be delayed.';
      n.classList.remove('hidden');
    }
  });
}

function updateStats() {
  $('#liveCount').textContent = S.live.length;
  $('#countyCount').textContent = new Set(S.live.map(p => p.county)).size;
  $('#dataMode').textContent = !LIVE ? 'Listings are not connected yet.' : S.error ? 'Listings could not be loaded.'
    : S.live.length ? 'Every live listing shows who listed it and when it was updated.' : 'No live listings yet. Agents are getting started.';
}

/* ---------- Filtering ---------- */
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function isFree(id, checkin, checkout) {
  const last = addDays(checkout, -1);
  return !(S.ranges[id] || []).some(r => r.s <= last && r.e >= checkin);
}
function matches(p) {
  const f = S.f;
  if (p.kind !== S.mode) return false;
  if (f.county && p.county !== f.county) return false;
  if (f.type && p.property_type !== f.type) return false;
  if (f.q) {
    const hay = [p.title, p.locality, p.county, p.property_type, p.address_text, ...(p.amenities || [])].join(' ').toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
  }
  for (const a of f.amenities) if (!(p.amenities || []).includes(a)) return false;
  if (S.mode === 'rent') {
    if (f.budget && Number(p.monthly_price) > Number(f.budget)) return false;
    if (f.beds && Number(p.bedrooms) < Number(f.beds)) return false;
  } else {
    if (f.budget && Number(p.nightly_price) > Number(f.budget)) return false;
    if (f.guests && Number(p.max_guests) < Number(f.guests)) return false;
    if (f.checkin && f.checkout && f.checkout > f.checkin && !isFree(p.id, f.checkin, f.checkout)) return false;
  }
  return true;
}
function sorter(a, b) {
  if (S.sort === 'low') return priceOf(a) - priceOf(b);
  if (S.sort === 'high') return priceOf(b) - priceOf(a);
  if (S.sort === 'featured' && b.tier !== a.tier) return b.tier - a.tier;
  return new Date(b.updated_at) - new Date(a.updated_at);
}
function currentResults() {
  const hasLive = S.live.some(p => p.kind === S.mode);
  const pool = hasLive ? S.live : S.demos;
  return { items: pool.filter(matches).sort(sorter), sample: !hasLive };
}

/* ---------- Rendering ---------- */
function cardHTML(p) {
  const r = ratingOf(p);
  const sample = p.is_demo;
  const tag = sample ? '<span class="tag sample">Sample listing</span>' : p.tier >= 3 ? '<span class="tag top">Signature</span>' : `<span class="tag">${p.kind === 'stay' ? 'Short stay' : 'For rent'}</span>`;
  const saved = S.saved.has(String(p.id)), cmp = S.compare.has(String(p.id));
  return `<article class="card">
    <div class="card-media">${cover(p) ? `<img src="${esc(cover(p))}" alt="${esc(p.title)}" loading="lazy" onerror="this.remove()"/>` : ''}${tag}
      <div class="card-btns">
        <button class="icon-btn" data-act="compare" data-id="${esc(p.id)}" aria-pressed="${cmp}" aria-label="${cmp ? 'Remove from comparison' : 'Add to comparison'}">${icon('compare')}</button>
        <button class="icon-btn heart" data-act="save" data-id="${esc(p.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save property'}">${icon('heart')}</button>
      </div>
    </div>
    <div class="card-body">
      <div class="price"><b>${money(priceOf(p))}</b><span>${p.kind === 'stay' ? 'a night' : 'a month'}</span></div>
      <h3><a href="?property=${encodeURIComponent(p.id)}" data-act="open" data-id="${esc(p.id)}">${esc(p.title)}</a></h3>
      <p class="loc">${esc(p.locality)}, ${esc(p.county)}</p>
      <ul class="facts"><li>${icon('bed')}${p.bedrooms} ${p.bedrooms == 1 ? 'bed' : 'beds'}</li><li>${icon('bath')}${p.bathrooms} ${p.bathrooms == 1 ? 'bath' : 'baths'}</li>${p.kind === 'stay' ? `<li>${icon('users')}Up to ${p.max_guests}</li>` : p.size_sqm ? `<li>${icon('area')}${p.size_sqm} m²</li>` : ''}</ul>
      <div class="card-foot"><span class="rating">${r ? icon('star') + r.avg.toFixed(1) + ` <span class="muted">(${r.n})</span>` : '<span class="muted">New</span>'}</span><span>${sample ? 'Not a real listing' : 'Updated ' + esc(dateText(p.updated_at))}</span></div>
    </div>
  </article>`;
}

function render() {
  const rent = S.mode === 'rent';
  $('#listHeading').textContent = rent ? 'Rentals across Kenya' : 'Short stays across Kenya';
  $('#listSub').textContent = rent ? 'Monthly rentals from independent agents and agencies.' : 'Nightly stays from hosts, with unavailable dates shown on each listing.';
  $('#filters').className = 'filters mode-' + S.mode;
  $$('#modeSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  $('#grid').classList.toggle('is-list', S.view === 'list');

  const { items, sample } = currentResults();
  const shown = items.slice(0, S.limit);
  const noun = rent ? 'rental' : 'stay';
  const bits = [S.f.county && ' in ' + esc(S.f.county), S.f.q && ' matching “' + esc(S.f.q) + '”'].filter(Boolean).join('');
  $('#resultNote').innerHTML = `<b>${items.length}</b> ${noun}${items.length === 1 ? '' : 's'}${bits}`
    + (sample ? `<span class="sample">There are no live ${rent ? 'rentals' : 'stays'} yet. These are labelled sample listings that show how Nestify works, and you cannot contact anyone through them.</span>` : '');

  if (!items.length) {
    $('#grid').innerHTML = S.error && !S.live.length
      ? `<div class="empty"><h3>Listings did not load</h3><p>Check your connection and try again.</p><button class="btn" data-act="reload">Try again</button></div>`
      : `<div class="empty"><h3>No ${noun}s match those filters</h3><p>Try a wider budget, another county or fewer amenities.</p><button class="btn" data-act="clear">Clear filters</button></div>`;
  } else {
    $('#grid').innerHTML = shown.map(cardHTML).join('');
  }
  const more = items.length - shown.length;
  $('#moreBtn').classList.toggle('hidden', more <= 0);
  $('#moreBtn').textContent = `Show ${Math.min(more, 9)} more of ${more}`;
  $('#savedCount').textContent = S.saved.size;
}

function fillBudgets() {
  const opts = BUDGETS[S.mode].map(v => `<option value="${v}">Up to ${money(v)}</option>`).join('');
  $('#fBudget').innerHTML = '<option value="">Any budget</option>' + opts;
  $('#fNight').innerHTML = '<option value="">Any budget</option>' + opts;
  $('#hBudget').innerHTML = '<option value="">any budget</option>' + BUDGETS[S.mode].map(v => `<option value="${v}">${money(v)}${S.mode === 'rent' ? ' a month' : ' a night'}</option>`).join('');
}
function syncInputs() {
  const f = S.f;
  $('#fQ').value = f.q; $('#fCounty').value = f.county; $('#fType').value = f.type;
  $('#fBudget').value = S.mode === 'rent' ? f.budget : ''; $('#fNight').value = S.mode === 'stay' ? f.budget : '';
  $('#fBeds').value = f.beds; $('#fGuests').value = f.guests; $('#fIn').value = f.checkin; $('#fOut').value = f.checkout;
  $('#hMode').value = S.mode; $('#hCounty').value = f.county; $('#hBudget').value = f.budget;
  $$('#amenityChips .chip').forEach(c => c.setAttribute('aria-pressed', String(f.amenities.has(c.dataset.a))));
}
function setMode(mode) {
  if (mode === S.mode) return;
  S.mode = mode; S.f.budget = ''; S.limit = 9;
  fillBudgets(); syncInputs(); render();
}
function readFilters() {
  const f = S.f;
  f.q = $('#fQ').value.trim(); f.county = $('#fCounty').value; f.type = $('#fType').value;
  f.budget = S.mode === 'rent' ? $('#fBudget').value : $('#fNight').value;
  f.beds = $('#fBeds').value; f.guests = $('#fGuests').value; f.checkin = $('#fIn').value; f.checkout = $('#fOut').value;
  if (f.checkin) $('#fOut').min = addDays(f.checkin, 1);
  S.limit = 9; render();
}

/* ---------- Property dialog ---------- */
function starsHTML(n) { return `<span class="stars" role="img" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map(i => icon('star', i > n ? 'off' : '')).join('')}</span>`; }

function reviewsHTML(p) {
  const rs = p.property_reviews || [], r = ratingOf(p);
  const list = rs.length ? rs.slice(0, 8).map(x => `<article class="review"><header><span>${starsHTML(Number(x.rating))}</span><span>${esc(fmtDate(x.created_at))}</span></header>
      <h4>${esc(x.title || 'Guest review')}</h4><p>${esc(x.body)}</p><small class="muted">${esc(x.reviewer_name)}</small>
      ${x.owner_response ? `<aside><b>Reply from the agent</b><br/>${esc(x.owner_response)}</aside>` : ''}</article>`).join('')
    : '<p class="muted" style="margin-top:.8rem">No reviews yet. If you have rented or stayed here, tell others what it was like.</p>';
  return `<section class="reviews" id="reviews" aria-label="Reviews">
    <div class="reviews-head"><h3 style="margin:0">${r ? `${starsHTML(Math.round(r.avg))} ${r.avg.toFixed(1)} from ${r.n} review${r.n === 1 ? '' : 's'}` : 'Reviews'}</h3>
      ${p.is_demo ? '' : '<button class="btn btn-ghost btn-sm" data-act="review-toggle">Write a review</button>'}</div>
    <form class="review-form hidden" data-form="review" data-id="${esc(p.id)}" novalidate>
      <p class="small muted">Reviews are posted publicly with your name. Your email stays private and is only used to stop duplicate reviews.</p>
      <div class="row2"><label class="fld"><span>Your name</span><input name="name" required minlength="2" maxlength="80" autocomplete="name"/></label>
        <label class="fld"><span>Email (private)</span><input name="email" type="email" required autocomplete="email"/></label></div>
      <fieldset class="pref"><legend>Your rating</legend><div class="star-input">${[5, 4, 3, 2, 1].map(i => `<input type="radio" name="rating" id="rt${i}" value="${i}" ${i === 5 ? 'checked' : ''}/><label for="rt${i}" title="${i} star${i > 1 ? 's' : ''}"><span class="sr">${i} star${i > 1 ? 's' : ''}</span>${icon('star')}</label>`).join('')}</div></fieldset>
      <label class="fld"><span>Headline (optional)</span><input name="title" maxlength="100"/></label>
      <label class="fld"><span>Your review</span><textarea name="body" required minlength="20" maxlength="1500" placeholder="What was it like? Mention the condition, the agent and anything others should know."></textarea><small>At least 20 characters.</small></label>
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"/></label></div>
      <button class="btn">Post review</button><p class="form-msg" role="alert"></p>
    </form>
    <div id="reviewList">${list}</div></section>`;
}

function contactFields() {
  return `<label class="fld"><span>Full name</span><input name="name" required minlength="2" maxlength="120" autocomplete="name"/></label>
    <label class="fld"><span>WhatsApp number</span><input name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="0712 345 678"/><small>The agent can reply to this number.</small></label>
    <label class="fld"><span>Email</span><input name="email" type="email" required autocomplete="email"/></label>
    <fieldset class="pref"><legend>Reply to me by</legend><div class="pref-opts">
      <label><input type="radio" name="pref" value="whatsapp" checked/><span>WhatsApp</span></label>
      <label><input type="radio" name="pref" value="email"/><span>Email</span></label>
      <label><input type="radio" name="pref" value="phone"/><span>Phone call</span></label></div></fieldset>`;
}
function consentField(who) {
  return `<label class="check"><input type="checkbox" name="consent" required/><span>I agree that ${who} may contact me on the WhatsApp number and email above about this property.</span></label>`;
}

function contactHTML(p) {
  if (p.is_demo) return `<aside class="contact"><h3>Sample listing</h3><p class="demo-note">This is an example that shows how a Nestify listing looks. It is not a real property, so there is nobody to contact.</p></aside>`;
  if (p.kind === 'stay') {
    return `<form class="contact" data-form="booking" data-id="${esc(p.id)}" novalidate><h3>Request this stay</h3>
      <p class="small muted">${money(p.nightly_price)} a night${p.min_nights > 1 ? `, minimum ${p.min_nights} nights` : ''}. Nothing is charged here. The host confirms dates with you directly.</p>
      <div class="row2 keep"><label class="fld"><span>Check in</span><input name="checkin" type="date" required min="${new Date().toISOString().slice(0, 10)}"/></label><label class="fld"><span>Check out</span><input name="checkout" type="date" required/></label></div>
      <label class="fld"><span>Guests</span><input name="guests" type="number" required min="1" max="${p.max_guests || 20}" value="1"/></label>
      <div class="total"><span>Estimated total</span><b data-total>${money(0)}</b></div>
      ${contactFields()}
      <label class="fld"><span>Message (optional)</span><textarea name="message" rows="3"></textarea></label>
      ${consentField('the host')}
      <button class="btn btn-block">Send booking request</button><p class="form-msg" role="alert"></p></form>`;
  }
  return `<form class="contact" data-form="enquiry" data-id="${esc(p.id)}" novalidate><h3>Message the agent</h3>
    <p class="small muted">The agent replies to you directly, so you can talk and arrange a viewing outside Nestify.</p>
    ${contactFields()}
    <label class="fld"><span>Message</span><textarea name="message" required minlength="5" rows="4">Hi, is this property still available? I would like to arrange a viewing.</textarea></label>
    ${consentField('this agent')}
    <button class="btn btn-block">Send enquiry</button><p class="form-msg" role="alert"></p></form>`;
}

function availabilityHTML(p) {
  if (p.kind !== 'stay' || p.is_demo) return '';
  const ranges = (S.ranges[p.id] || []).filter(r => r.e >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.s.localeCompare(b.s));
  if (!ranges.length) return `<h3>Availability</h3><p class="avail free">No dates are blocked right now. Pick any dates in the request form.</p>`;
  return `<h3>Availability</h3><p class="avail">Already taken: ${ranges.slice(0, 8).map(r => r.s === r.e ? fmtDate(r.s) : `${fmtDate(r.s)} to ${fmtDate(r.e)}`).map(esc).join('; ')}${ranges.length > 8 ? ' and more' : ''}.</p>`;
}

function propertyHTML(p) {
  const imgs = images(p), video = (p.media || []).find(m => m.kind === 'video');
  const shown = imgs.slice(0, 3);
  const gallery = imgs.length
    ? `<div class="gallery ${shown.length === 1 ? 'one' : shown.length === 2 ? 'two' : ''}">${shown.map((m, i) => `<button type="button" data-act="lightbox" data-id="${esc(p.id)}" data-i="${i}" aria-label="Open photo ${i + 1} of ${imgs.length}"><img src="${esc(m.public_url)}" alt="${esc(m.alt_text || p.title)}" onerror="this.style.visibility='hidden'"/>${i === shown.length - 1 && imgs.length > shown.length ? `<span class="more-photos">+${imgs.length - shown.length} photos</span>` : ''}</button>`).join('')}</div>`
    : '<div class="gallery-empty">No photos yet</div>';
  const initials = (p.agent_name || 'A').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return `${gallery}<div class="detail"><div>
    <div class="detail-head"><span class="badge ${p.is_demo ? 'warn' : ''}">${p.is_demo ? 'Sample listing' : p.kind === 'stay' ? 'Short stay' : 'For rent'}</span>
      <h2 id="modalTitle">${esc(p.title)}</h2><p class="loc">${icon('pin')} ${esc([...new Set([p.address_text, p.locality, p.county].filter(Boolean).flatMap(x => String(x).split(',').map(y => y.trim())))].join(', '))}</p></div>
    <div class="price" style="margin-top:.8rem"><b style="font-size:1.8rem">${money(priceOf(p))}</b><span>${p.kind === 'stay' ? 'a night' : 'a month'}</span></div>
    <div class="detail-actions"><button class="btn btn-ghost btn-sm" data-act="share" data-id="${esc(p.id)}">${icon('share')} Share</button>
      <button class="btn btn-ghost btn-sm" data-act="save" data-id="${esc(p.id)}" aria-pressed="${S.saved.has(String(p.id))}">${icon('heart')} ${S.saved.has(String(p.id)) ? 'Saved' : 'Save'}</button>
      ${p.is_demo ? '' : `<button class="btn btn-ghost btn-sm" data-act="report" data-id="${esc(p.id)}">${icon('flag')} Report this listing</button>`}</div>
    <ul class="facts-row"><li>${icon('bed')}${p.bedrooms} ${p.bedrooms == 1 ? 'bedroom' : 'bedrooms'}</li><li>${icon('bath')}${p.bathrooms} ${p.bathrooms == 1 ? 'bathroom' : 'bathrooms'}</li>${p.size_sqm ? `<li>${icon('area')}${p.size_sqm} m²</li>` : ''}${p.kind === 'stay' ? `<li>${icon('users')}Up to ${p.max_guests} guests</li>` : ''}</ul>
    <h3>About this property</h3><p class="body">${esc(p.description)}</p>
    ${(p.amenities || []).length ? `<h3>What it offers</h3><div class="amen-list">${p.amenities.map(a => `<span class="badge">${esc(a)}</span>`).join('')}</div>` : ''}
    ${video ? `<h3>Video tour</h3><video controls preload="metadata" src="${esc(video.public_url)}" style="width:100%;border-radius:var(--r-md)"></video>` : ''}
    ${availabilityHTML(p)}
    <h3>Location</h3><iframe class="map-frame" title="Map of ${esc(p.title)}" loading="lazy" src="https://www.google.com/maps?q=${encodeURIComponent(p.latitude + ',' + p.longitude)}&z=15&output=embed"></iframe>
    <p class="small" style="margin-top:.5rem"><a href="https://www.google.com/maps?q=${encodeURIComponent(p.latitude + ',' + p.longitude)}" target="_blank" rel="noopener">Open in Google Maps ${icon('external')}</a></p>
    <div class="agent-box"><span class="avatar">${esc(initials)}</span><div><b>${p.is_demo ? 'Nestify sample' : 'Listed by ' + esc(p.agent_name || 'a registered agent')}</b>${!p.is_demo && p.agency_name ? `<br/>${esc(p.agency_name)}` : ''}${p.agent_verified ? ' <span class="badge ok">Verified agent</span>' : ''}
      <p>${p.is_demo ? 'Not a real agent.' : 'Last updated ' + esc(dateText(p.updated_at)) + '. Always view the property and confirm the agent before you pay.'}</p></div></div>
    ${reviewsHTML(p)}
  </div>${contactHTML(p)}</div>`;
}

function openModal(html, narrow = false) {
  const m = $('#modal');
  $('#modalBody').innerHTML = html;
  m.classList.toggle('narrow', narrow);
  hydrateIcons(m);
  if (!m.open) { S.lastFocus = document.activeElement; m.showModal(); }
  m.scrollTop = 0;
}
function closeModal() { const m = $('#modal'); if (m.open) m.close(); }

function openProperty(id, fromLink = false) {
  const p = findProp(id);
  if (!p) return;
  S.recent = [String(p.id), ...S.recent.filter(x => x !== String(p.id))].slice(0, 6);
  writeLS('nestify_recent', S.recent);
  openModal(propertyHTML(p));
  const url = new URL(location.href); url.searchParams.set('property', p.id);
  history.replaceState(null, '', url);
  document.title = p.title + ' | Nestify';
  renderRecent();
}

/* ---------- Forms ---------- */
async function submitEnquiry(form) {
  const p = findProp(form.dataset.id), fd = new FormData(form), msg = $('.form-msg', form), btn = $('button.btn', form);
  msg.textContent = '';
  if (!form.checkValidity()) { form.reportValidity(); return; }
  btn.disabled = true; btn.textContent = 'Sending…';
  const { error } = await db.from('enquiries').insert({
    property_id: p.id, agent_id: p.agent_id, sender_name: fd.get('name'), sender_email: fd.get('email'), sender_phone: fd.get('phone'),
    message: fd.get('message'), preferred_contact: fd.get('pref'), contact_consent: true
  });
  if (error) { msg.textContent = dbError(error); btn.disabled = false; btn.textContent = 'Send enquiry'; return; }
  form.innerHTML = sentHTML('Enquiry sent', `${esc(p.agent_name || 'The agent')} can now see your message and will reply on ${prefLabel(fd.get('pref'))}. Keep your phone nearby.`);
}
const prefLabel = v => ({ whatsapp: 'WhatsApp', email: 'email', phone: 'a phone call' }[v] || 'your chosen channel');
const sentHTML = (title, text) => `<div class="sent">${icon('check')}<h3>${title}</h3><p class="muted">${text}</p><p class="small muted">Until you have seen the property, do not send money to anyone.</p></div>`;

function nightsBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function updateBookingTotal(form) {
  const p = findProp(form.dataset.id); if (!p) return;
  const a = form.elements.checkin.value, b = form.elements.checkout.value;
  if (a) form.elements.checkout.min = addDays(a, 1);
  const n = a && b ? nightsBetween(a, b) : 0;
  $('[data-total]', form).textContent = n > 0 ? `${money(n * p.nightly_price)} (${n} night${n > 1 ? 's' : ''})` : money(0);
}
async function submitBooking(form) {
  const p = findProp(form.dataset.id), fd = new FormData(form), msg = $('.form-msg', form), btn = $('button.btn', form);
  msg.textContent = '';
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const a = fd.get('checkin'), b = fd.get('checkout'), n = nightsBetween(a, b);
  if (n < (p.min_nights || 1)) { msg.textContent = `This stay needs at least ${p.min_nights || 1} night(s).`; return; }
  if (!isFree(p.id, a, b)) { msg.textContent = 'Some of those nights are already taken. Choose different dates.'; return; }
  btn.disabled = true; btn.textContent = 'Sending…';
  const { error } = await db.from('booking_requests').insert({
    property_id: p.id, agent_id: p.agent_id, guest_name: fd.get('name'), guest_email: fd.get('email'), guest_phone: fd.get('phone'),
    check_in: a, check_out: b, guests: Number(fd.get('guests')), message: fd.get('message') || null,
    total_quote: n * Number(p.nightly_price), preferred_contact: fd.get('pref'), contact_consent: true
  });
  if (error) { msg.textContent = dbError(error); btn.disabled = false; btn.textContent = 'Send booking request'; return; }
  form.innerHTML = sentHTML('Request sent', `${esc(p.agent_name || 'The host')} will confirm the dates with you on ${prefLabel(fd.get('pref'))}. Estimated total: ${money(n * p.nightly_price)}.`);
}

async function submitReview(form) {
  const p = findProp(form.dataset.id), fd = new FormData(form), msg = $('.form-msg', form), btn = $('button.btn', form);
  msg.textContent = ''; msg.classList.remove('ok');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  btn.disabled = true; btn.textContent = 'Posting…';
  const { data, error } = await db.functions.invoke('submit-review', { body: {
    property_id: p.id, reviewer_name: fd.get('name'), reviewer_email: fd.get('email'), rating: Number(fd.get('rating')),
    title: fd.get('title'), body: fd.get('body'), website: fd.get('website')
  } });
  if (error || (data && data.error)) { msg.textContent = await fnError(error, data); btn.disabled = false; btn.textContent = 'Post review'; return; }
  const { data: fresh } = await db.from('property_reviews').select(REVIEW_COLS).eq('property_id', p.id).order('created_at', { ascending: false });
  p.property_reviews = fresh || [];
  const section = $('#reviews');
  if (section) section.outerHTML = reviewsHTML(p);
  toast('Review posted. Thank you.', 'ok');
  render();
}

async function submitReport(form) {
  const p = findProp(form.dataset.id), fd = new FormData(form), msg = $('.form-msg', form), btn = $('button.btn', form);
  if (!form.checkValidity()) { form.reportValidity(); return; }
  btn.disabled = true;
  const { error } = await db.from('content_reports').insert({
    property_id: p.id, agent_id: p.agent_id, reporter_name: fd.get('name'), reporter_email: fd.get('email'), category: fd.get('category'), details: fd.get('details')
  });
  if (error) { msg.textContent = dbError(error); btn.disabled = false; return; }
  form.innerHTML = sentHTML('Report received', 'The Nestify team will look into this listing. Thank you for helping keep Nestify trustworthy.');
}

function reportHTML(p) {
  return `<div class="pad"><button class="btn-link" data-act="open" data-id="${esc(p.id)}">Back to the listing</button>
    <h2 class="dlg-title" style="margin-top:.8rem">Report this listing</h2><p class="muted">${esc(p.title)}</p>
    <form class="dlg-form" data-form="report" data-id="${esc(p.id)}" novalidate>
      <label class="fld"><span>What is wrong?</span><select name="category" required>${REPORT_REASONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label class="fld"><span>Details</span><textarea name="details" required minlength="20" maxlength="2000" placeholder="Tell us what you found. At least 20 characters."></textarea></label>
      <div class="row2"><label class="fld"><span>Your name</span><input name="name" required minlength="2"/></label><label class="fld"><span>Your email</span><input name="email" type="email" required/></label></div>
      <button class="btn">Send report</button><p class="form-msg" role="alert"></p></form></div>`;
}

function briefHTML() {
  return `<div class="pad"><h2 class="dlg-title">Tell us what you need</h2><p class="muted">We email your brief to the Nestify team. They share it with agents who may have a match.</p>
    <form class="dlg-form" data-form="brief" novalidate>
      <div class="row2"><label class="fld"><span>Your name</span><input name="name" required/></label><label class="fld"><span>WhatsApp or email</span><input name="contact" required/></label></div>
      <div class="row2"><label class="fld"><span>Looking for</span><select name="kind"><option>A rental</option><option>A short stay</option><option>A home to buy</option></select></label>
        <label class="fld"><span>County</span><select name="county">${COUNTIES.map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>
      <label class="fld"><span>Budget</span><input name="budget" placeholder="For example, KSh 80,000 a month"/></label>
      <label class="fld"><span>Must-haves</span><textarea name="needs" required minlength="10" placeholder="Bedrooms, area, move-in date, pets, parking…"></textarea></label>
      <button class="btn">Email my brief</button></form></div>`;
}
function submitBrief(form) {
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = Object.fromEntries(new FormData(form));
  const body = `Name: ${fd.name}\nContact: ${fd.contact}\nLooking for: ${fd.kind}\nCounty: ${fd.county}\nBudget: ${fd.budget || 'not given'}\n\nMust-haves:\n${fd.needs}`;
  location.href = mailLink(S.support.email, 'Property brief from Nestify', body);
  form.innerHTML = sentHTML('Your email is ready', 'Press send in your email app to share the brief with Nestify.');
}

/* ---------- Saved, compare, recent, share, lightbox ---------- */
function toggleSet(set, key, id) { id = String(id); set.has(id) ? set.delete(id) : set.add(id); writeLS(key, [...set]); }
function openSaved() {
  const items = allProps().filter(p => S.saved.has(String(p.id)));
  openModal(`<div class="pad"><h2 class="dlg-title">Saved properties</h2>${items.length ? items.map(p => `<div class="saved-row"><div><b>${esc(p.title)}</b><br/><span class="muted small">${esc(p.locality)}, ${esc(p.county)}, ${money(priceOf(p))}</span></div><div><button class="btn btn-sm" data-act="open" data-id="${esc(p.id)}">View</button> <button class="btn btn-ghost btn-sm" data-act="save" data-id="${esc(p.id)}" data-reopen="saved">Remove</button></div></div>`).join('') : '<p class="muted">Tap the heart on any listing to keep it here. Saved properties stay on this device.</p>'}</div>`, true);
}
function renderCompareBar() {
  S.compare = new Set([...S.compare].filter(id => !allProps().length || findProp(id)));
  const bar = $('#compareBar');
  bar.classList.toggle('hidden', !S.compare.size);
  $('#compareCount').textContent = `${S.compare.size} selected`;
  $('#compareThumbs').innerHTML = [...S.compare].map(id => { const p = findProp(id); return p ? `<img src="${esc(cover(p))}" alt="${esc(p.title)}"/>` : ''; }).join('');
}
function openCompare() {
  const items = [...S.compare].map(findProp).filter(Boolean);
  if (items.length < 2) return toast('Pick at least two properties to compare.');
  const row = (label, get) => `<div class="compare-row"><b>${label}</b>${items.map(p => `<span>${get(p)}</span>`).join('')}</div>`;
  openModal(`<div class="pad"><h2 class="dlg-title">Compare properties</h2><div class="compare-table" style="--cols:${items.length}">
    <div class="compare-row"><b></b>${items.map(p => `<span>${cover(p) ? `<img src="${esc(cover(p))}" alt=""/>` : ''}<strong>${esc(p.title)}</strong></span>`).join('')}</div>
    ${row('Price', p => esc(money(priceOf(p))) + (p.kind === 'stay' ? ' a night' : ' a month'))}
    ${row('Place', p => esc(p.locality + ', ' + p.county))}
    ${row('Space', p => `${p.bedrooms} bed, ${p.bathrooms} bath${p.size_sqm ? ', ' + p.size_sqm + ' m²' : ''}`)}
    ${row('Type', p => esc(p.property_type))}
    ${row('Offers', p => esc((p.amenities || []).slice(0, 6).join(', ') || 'Not listed'))}
    ${row('Listing', p => p.is_demo ? 'Sample' : 'Live, ' + esc(p.agent_name || 'agent'))}
  </div></div>`);
}
function renderRecent() {
  const items = S.recent.map(findProp).filter(Boolean);
  $('#recent').classList.toggle('hidden', !items.length);
  $('#recentRow').innerHTML = items.map(p => `<button class="recent-item" data-act="open" data-id="${esc(p.id)}">${cover(p) ? `<img src="${esc(cover(p))}" alt=""/>` : '<span></span>'}<span><b>${esc(p.title)}</b><small>${esc(p.locality)}, ${esc(money(priceOf(p)))}</small></span></button>`).join('');
}
async function shareProperty(id) {
  const p = findProp(id); if (!p) return;
  const url = new URL(location.origin + location.pathname); url.searchParams.set('property', p.id);
  try {
    if (navigator.share) await navigator.share({ title: p.title, text: `${p.title} on Nestify`, url: url.href });
    else { await navigator.clipboard.writeText(url.href); toast('Link copied'); }
  } catch (e) { if (e.name !== 'AbortError') toast('Sharing is not available here.', 'err'); }
}
function openLightbox(id, i = 0) {
  const p = findProp(id), imgs = images(p || {});
  if (!p || !imgs.length) return;
  const idx = (i + imgs.length) % imgs.length, m = imgs[idx], box = $('#lightbox');
  $('#lightboxBody').innerHTML = `<div class="lightbox"><div class="lb-top"><span>${idx + 1} of ${imgs.length}, ${esc(p.title)}</span><button class="icon-btn" data-act="close" aria-label="Close photos">${icon('x')}</button></div>
    <div class="lb-stage"><button class="icon-btn" data-act="lightbox" data-id="${esc(p.id)}" data-i="${idx - 1}" aria-label="Previous photo">${icon('left')}</button><img class="main" src="${esc(m.public_url)}" alt="${esc(m.alt_text || p.title)}"/><button class="icon-btn" data-act="lightbox" data-id="${esc(p.id)}" data-i="${idx + 1}" aria-label="Next photo">${icon('right')}</button></div>
    <div class="lb-bottom"><span class="small">${esc(m.alt_text || '')}</span></div></div>`;
  box.dataset.pid = p.id; box.dataset.i = idx;
  if (!box.open) box.showModal();
}

/* ---------- Planner ---------- */
function updatePlanner() {
  const value = Number($('#pv').value), dep = Number($('#pd').value), rate = Number($('#pr').value) / 100 / 12, months = Math.max(1, Number($('#pt').value)) * 12;
  const loan = value * (1 - dep / 100);
  const monthly = rate ? loan * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) : loan / months;
  $('#pvOut').textContent = money(value); $('#pdOut').textContent = dep + '%';
  $('#pMonthly').textContent = money(Math.round(monthly)); $('#pLoan').textContent = money(Math.round(loan)); $('#pCash').textContent = money(Math.round(value - loan));
}

/* ---------- Events ---------- */
const ACT = {
  menu(el) { const n = $('#mobileNav'); const open = n.classList.toggle('open'); el.setAttribute('aria-expanded', String(open)); },
  mode(el) { setMode(el.dataset.mode); $('#mobileNav').classList.remove('open'); if (el.dataset.scroll) $('#listings').scrollIntoView({ behavior: 'smooth' }); },
  view(el) { S.view = el.dataset.v; $$('[data-act=view]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); render(); },
  clear() { S.f = { q: '', county: '', type: '', budget: '', beds: '', guests: '', checkin: '', checkout: '', amenities: new Set() }; S.limit = 9; syncInputs(); render(); },
  more() { S.limit += 9; render(); },
  reload() { loadProperties(); },
  open(el) { openProperty(el.dataset.id); },
  save(el) {
    toggleSet(S.saved, 'nestify_saved', el.dataset.id); render();
    if (el.dataset.reopen === 'saved') openSaved();
    else if (el.closest('#modal')) openProperty(el.dataset.id);
    toast(S.saved.has(String(el.dataset.id)) ? 'Saved on this device' : 'Removed from saved');
  },
  compare(el) {
    const id = String(el.dataset.id);
    if (!S.compare.has(id) && S.compare.size >= 3) return toast('You can compare up to three properties.');
    toggleSet(S.compare, 'nestify_compare', id); renderCompareBar(); render();
  },
  'compare-open': openCompare,
  'compare-clear'() { S.compare.clear(); writeLS('nestify_compare', []); renderCompareBar(); render(); },
  saved: openSaved,
  'clear-recent'() { S.recent = []; writeLS('nestify_recent', []); renderRecent(); },
  share(el) { shareProperty(el.dataset.id); },
  report(el) { const p = findProp(el.dataset.id); if (p) openModal(reportHTML(p), true); },
  brief() { openModal(briefHTML(), true); },
  'review-toggle'(el) { const f = $('.review-form'); f.classList.toggle('hidden'); if (!f.classList.contains('hidden')) $('input[name=name]', f).focus(); },
  lightbox(el) { openLightbox(el.dataset.id, Number(el.dataset.i)); },
  close(el) { const d = el.closest('dialog'); if (d) d.close(); }
};
const FORMS = { enquiry: submitEnquiry, booking: submitBooking, review: submitReview, report: submitReport, brief: submitBrief,
  finder() {
    S.mode = $('#hMode').value; S.f.county = $('#hCounty').value; S.f.budget = $('#hBudget').value; S.limit = 9;
    fillBudgets(); $('#hBudget').value = S.f.budget; syncInputs(); render();
    $('#listings').scrollIntoView({ behavior: 'smooth' });
  } };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACT[el.dataset.act]) return;
  if (el.tagName === 'A' && el.dataset.act === 'open') e.preventDefault();
  ACT[el.dataset.act](el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f || !FORMS[f.dataset.form]) return;
  e.preventDefault(); FORMS[f.dataset.form](f);
});
document.addEventListener('input', e => {
  const f = e.target.closest('form[data-form=booking]');
  if (f) updateBookingTotal(f);
});
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });
$('#modal').addEventListener('close', () => {
  const url = new URL(location.href); url.searchParams.delete('property'); history.replaceState(null, '', url);
  document.title = 'Nestify | Homes and stays in Kenya, straight from the agent';
  if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus();
});
$('#lightbox').addEventListener('click', e => { if (e.target === $('#lightbox')) $('#lightbox').close(); });
$('#lightbox').addEventListener('keydown', e => {
  const box = $('#lightbox');
  if (e.key === 'ArrowRight') openLightbox(box.dataset.pid, Number(box.dataset.i) + 1);
  if (e.key === 'ArrowLeft') openLightbox(box.dataset.pid, Number(box.dataset.i) - 1);
});

/* ---------- Init ---------- */
function init() {
  const countyOpts = COUNTIES.map(c => `<option>${esc(c)}</option>`).join('');
  $('#fCounty').innerHTML = '<option value="">All counties</option>' + countyOpts;
  $('#hCounty').innerHTML = '<option value="">any county</option>' + countyOpts;
  $('#fType').innerHTML = '<option value="">Any type</option>' + PROPERTY_TYPES.map(t => `<option>${esc(t)}</option>`).join('');
  $('#amenityChips').innerHTML = CHIP_AMENITIES.map(a => `<button type="button" class="chip" data-a="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join('');
  $('#amenityChips').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.f.amenities.has(c.dataset.a) ? S.f.amenities.delete(c.dataset.a) : S.f.amenities.add(c.dataset.a);
    c.setAttribute('aria-pressed', String(S.f.amenities.has(c.dataset.a))); S.limit = 9; render();
  });
  const today = new Date().toISOString().slice(0, 10);
  $('#fIn').min = today; $('#fOut').min = addDays(today, 1);
  fillBudgets();
  $('#hMode').addEventListener('change', e => { S.mode = e.target.value; S.f.budget = ''; fillBudgets(); });
  $('#sortSel').addEventListener('change', e => { S.sort = e.target.value; render(); });
  $('#filters').addEventListener('input', debounce(readFilters, 150));
  $('#filters').addEventListener('change', readFilters);
  $('#planner-form').addEventListener('input', updatePlanner);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#mobileNav').classList.remove('open'); });
  updatePlanner(); syncInputs();
  loadSettings();
  loadProperties();
}
init();
