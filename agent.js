/* Nestify agent workspace.
   Shared helpers (db, $, esc, money, icon, waLink, mailLink, telLink, toast, ...) live in common.js. */

// Keep in step with current_agreement_version() in the database and AGREEMENT_VERSION in supabase/functions/daraja.
const AGREEMENT_VERSION = '2026-10-15';
const PLANS = {
  starter: { name: 'Starter', amount: 2500, limit: 3, photos: 12, videos: 1, blurb: 'For an independent agent starting a portfolio.', perks: ['3 live listings', 'Up to 12 photos and 1 video per listing', 'Enquiries and bookings with WhatsApp, email and call buttons'] },
  growth: { name: 'Growth', amount: 6500, limit: 12, photos: 25, videos: 3, blurb: 'For agencies running rentals and stays.', perks: ['12 live listings', 'Up to 25 photos and 3 videos per listing', 'Listed ahead of Starter listings'] },
  elite: { name: 'Elite', amount: 15000, limit: 40, photos: 40, videos: 5, blurb: 'For brokerages, lodges and property groups.', perks: ['40 live listings', 'Up to 40 photos and 5 videos per listing', 'Listed first in search results'] }
};
const DEFAULT_CAPS = { photos: 12, videos: 1 };
const MAX_VIDEO_MB = 50;

Object.assign(ICONS, {
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15L6 17ZM10 21h4"/>',
  card: '<path d="M3 6h18v12H3zM3 10h18M7 15h3"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
});

const S = {
  user: null, profile: null, props: [], enquiries: [], bookings: [], reviews: [], notes: [], subs: [], agreement: null,
  view: 'overview', filter: 'all', editing: null, files: [], removed: new Set(), existing: [], pay: null, lastLoad: 0, recovery: false
};

const VIEWS = {
  overview: ['Overview', 'home'], properties: ['Properties', 'grid'], new: ['Add property', 'plus'],
  enquiries: ['Enquiries', 'chat'], bookings: ['Bookings', 'calendar'], reviews: ['Reviews', 'star'],
  notifications: ['Notifications', 'bell'], billing: ['Subscription', 'card'], profile: ['Profile', 'user']
};

/* ---------- Small helpers ---------- */
const now = () => new Date();
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'there';
const propById = id => S.props.find(p => p.id === id);
const sortedMedia = p => [...(p.property_media || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
const coverOf = p => (sortedMedia(p).find(m => m.kind === 'image') || {}).public_url || '';
const activeSub = () => S.subs.find(s => s.status === 'paid' && new Date(s.starts_at) <= now() && new Date(s.ends_at) > now()) || null;
const publishedCount = () => S.props.filter(p => p.status === 'published').length;
const planOf = s => PLANS[s && s.plan] || null;
const caps = () => { const p = planOf(activeSub()); return p ? { photos: p.photos, videos: p.videos } : DEFAULT_CAPS; };
const limitOf = () => { const s = activeSub(); return s ? (s.listing_limit || (planOf(s) || {}).limit || 0) : 0; };
const canPublishMore = (alreadyLive = false) => Boolean(activeSub() && S.agreement && (alreadyLive || publishedCount() < limitOf()));
const sub = () => { const dlg = $('#dlg'); return dlg; };

const STATUS = {
  draft: ['Draft', 'mute'], pending: ['In review', 'warn'], published: ['Live', 'ok'], rejected: ['Needs changes', 'bad'], archived: ['Archived', 'mute']
};
const REQ_STATUS = { new: ['New', 'warn'], contacted: ['Contacted', 'ok'], accepted: ['Accepted', 'ok'], declined: ['Declined', 'mute'], closed: ['Closed', 'mute'] };
const badge = ([label, kind]) => `<span class="badge ${kind}">${esc(label)}</span>`;
const empty = (title, text, action = '') => `<div class="empty-state"><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;

function openDlg(html) { $('#dlgBody').innerHTML = html; const d = $('#dlg'); if (!d.open) d.showModal(); }
function closeDlg() { const d = $('#dlg'); if (d.open) d.close(); S.pay = null; }

/* ---------- Boot and auth ---------- */
async function boot() {
  if (!LIVE) { hideBoot(); $('#authView').classList.remove('hidden'); $('#configWarn').classList.remove('hidden'); return; }
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') { S.recovery = true; showAuthView(); showPane('reset'); return; }
    if (event === 'SIGNED_OUT') { S.user = null; showAuthView(); }
    if (event === 'SIGNED_IN' && session && !S.user && !S.recovery) { S.user = session.user; await enterApp(); }
  });
  const { data } = await db.auth.getSession();
  if (data.session && !S.recovery) { S.user = data.session.user; await enterApp(); }
  else if (!S.recovery) showAuthView();
}
function hideBoot() { const b = document.getElementById('boot'); if (b) b.remove(); }
function showAuthView() { hideBoot(); $('#appView').classList.add('hidden'); $('#authView').classList.remove('hidden'); }
function showPane(name) {
  $$('#authView form').forEach(f => f.classList.toggle('hidden', f.id !== 'pane' + name[0].toUpperCase() + name.slice(1)));
  $$('#authTabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pane === name)));
  $('#authTabs').classList.toggle('hidden', name === 'forgot' || name === 'reset');
  $$('#authView .form-msg').forEach(m => { m.textContent = ''; m.classList.remove('ok'); });
}
function formMsg(form, text, ok = false) { const m = $('.form-msg', form); if (m) { m.textContent = text; m.classList.toggle('ok', ok); } }
async function withBusy(btn, label, fn) {
  const old = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.textContent = label; }
  try { return await fn(); } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
}

async function authLogin(form) {
  const fd = new FormData(form);
  await withBusy($('button.btn', form), 'Signing in…', async () => {
    const { error } = await db.auth.signInWithPassword({ email: String(fd.get('email')).trim(), password: fd.get('password') });
    if (error) formMsg(form, /confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox for the link.' : 'That email and password do not match.');
  });
}
async function authRegister(form) {
  const fd = new FormData(form);
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const phone = toIntlPhone(fd.get('phone'));
  if (!/^254[17]\d{8}$/.test(phone) && !/^\d{9,15}$/.test(phone)) { formMsg(form, 'Enter a phone number that works on WhatsApp, for example 0712 345 678.'); return; }
  await withBusy($('button.btn', form), 'Creating account…', async () => {
    const { data, error } = await db.auth.signUp({
      email: String(fd.get('email')).trim(), password: fd.get('password'),
      options: { emailRedirectTo: location.origin + location.pathname, data: { full_name: String(fd.get('name')).trim(), phone, agency_name: String(fd.get('agency')).trim(), license_number: String(fd.get('license') || '').trim() } }
    });
    if (error) { formMsg(form, /registered/i.test(error.message) ? 'An account with that email already exists. Try signing in.' : error.message); return; }
    if (data.session) return; // signed in: onAuthStateChange takes over
    showPane('login');
    formMsg($('#paneLogin'), 'Account created. Check your email and confirm it, then sign in.', true);
  });
}
async function authForgot(form) {
  await withBusy($('button.btn', form), 'Sending…', async () => {
    const { error } = await db.auth.resetPasswordForEmail(String(new FormData(form).get('email')).trim(), { redirectTo: location.origin + location.pathname });
    formMsg(form, error ? 'We could not send that link. Please try again.' : 'If that email has an account, a reset link is on its way.', !error);
  });
}
async function authReset(form) {
  await withBusy($('button.btn', form), 'Saving…', async () => {
    const { error } = await db.auth.updateUser({ password: new FormData(form).get('password') });
    if (error) { formMsg(form, error.message); return; }
    S.recovery = false; toast('Password updated.', 'ok');
    const { data } = await db.auth.getSession();
    if (data.session) { S.user = data.session.user; await enterApp(); } else showPane('login');
  });
}
async function logout() { await db.auth.signOut(); S.user = null; S.profile = null; showAuthView(); showPane('login'); }

/* ---------- Data ---------- */
async function loadProfile() {
  let row = null;
  const r = await db.rpc('my_profile');
  if (!r.error && Array.isArray(r.data) && r.data[0]) row = r.data[0];
  if (!row) { // before my_profile() exists: read the own row directly
    const { data } = await db.from('profiles').select('*').eq('id', S.user.id).maybeSingle();
    if (data) row = { ...data, email: data.email || S.user.email };
  }
  S.profile = row || { id: S.user.id, email: S.user.email, full_name: '', phone: '', agency_name: '', license_number: '', role: 'agent', verification_status: 'pending', account_status: 'active' };
}
async function loadData() {
  const uid = S.user.id;
  const [p, e, b, rv, n, su, ag] = await Promise.all([
    db.from('properties').select('*, property_media(id,kind,public_url,storage_path,sort_order,alt_text)').eq('agent_id', uid).order('updated_at', { ascending: false }),
    db.from('enquiries').select('*, properties(title)').eq('agent_id', uid).order('created_at', { ascending: false }).limit(200),
    db.from('booking_requests').select('*, properties(title)').eq('agent_id', uid).order('created_at', { ascending: false }).limit(200),
    db.from('property_reviews').select('id,property_id,reviewer_name,rating,title,body,owner_response,owner_responded_at,created_at, properties!inner(title,agent_id)').eq('properties.agent_id', uid).order('created_at', { ascending: false }).limit(200),
    db.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(80),
    db.from('agent_subscriptions').select('id,plan,status,amount_kes,listing_limit,starts_at,ends_at,mpesa_receipt_number,failure_reason,created_at').eq('agent_id', uid).order('created_at', { ascending: false }).limit(15),
    db.from('agent_agreements').select('id').eq('agent_id', uid).eq('agreement_version', AGREEMENT_VERSION).maybeSingle()
  ]);
  S.props = p.data || []; S.enquiries = e.data || []; S.bookings = b.data || []; S.reviews = rv.data || [];
  S.notes = n.data || []; S.subs = su.data || []; S.agreement = ag.data || null; S.lastLoad = Date.now();
  const failed = [p, e, b, rv, n, su].find(x => x.error);
  if (failed) toast('Some of your data could not be loaded. Pull to refresh or try again.', 'err');
}
async function enterApp() {
  hideBoot();
  $('#authView').classList.add('hidden'); $('#appView').classList.remove('hidden');
  $('#view').innerHTML = '<div class="skeleton" style="min-height:260px"></div>';
  await loadProfile(); await loadData();
  const v = (location.hash || '').replace('#', '');
  S.view = VIEWS[v] ? v : 'overview';
  render();
}

/* ---------- Shell ---------- */
function render() {
  const [title] = VIEWS[S.view];
  $('#pageTitle').textContent = title;
  const name = S.profile.full_name || 'Agent';
  $('#whoName').textContent = name;
  $('#initials').textContent = name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'NA';
  const sb = activeSub(); $('#whoPlan').textContent = sb ? (planOf(sb) ? planOf(sb).name + ' plan' : 'Active') : 'No active plan';
  const counts = {
    enquiries: S.enquiries.filter(x => x.status === 'new').length, bookings: S.bookings.filter(x => x.status === 'new').length,
    reviews: S.reviews.filter(x => !x.owner_response).length, notifications: S.notes.filter(x => !x.is_read).length
  };
  $('#nav').innerHTML = Object.entries(VIEWS).map(([k, [label, ic]]) => {
    let c = counts[k] ? `<span class="count">${counts[k]}</span>` : '';
    if (k === 'billing') c = sb ? '<span class="count ok">Active</span>' : '<span class="count">Set up</span>';
    return `<a href="#${k}" data-act="nav" data-view="${k}" ${k === S.view ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${c}</a>`;
  }).join('');
  
  const view = $('#view');
  view.innerHTML = ({ overview: vOverview, properties: vProperties, new: vForm, enquiries: () => vInbox('enquiry'), bookings: () => vInbox('booking'), reviews: vReviews, notifications: vNotes, billing: vBilling, profile: vProfile })[S.view]();
  if (S.view === 'new') afterForm();
  $('#sidebar').classList.remove('open');
}
function go(view) { S.view = VIEWS[view] ? view : 'overview'; if (location.hash !== '#' + S.view) history.replaceState(null, '', '#' + S.view); render(); window.scrollTo({ top: 0 }); }

/* ---------- Overview ---------- */
function vOverview() {
  const sb = activeSub(), live = publishedCount(), newE = S.enquiries.filter(x => x.status === 'new').length, newB = S.bookings.filter(x => x.status === 'new').length;
  let notice;
  if (sb) {
    const days = Math.max(0, Math.ceil((new Date(sb.ends_at) - now()) / 86400000));
    notice = `<div class="notice-card ok"><div><b>${esc((planOf(sb) || {}).name || 'Your')} plan is active</b>${live} of ${limitOf()} listing slots used. ${days <= 7 ? `Renews by ${fmtDate(sb.ends_at)}, so renew soon.` : `Active until ${fmtDate(sb.ends_at)}.`}</div><button class="btn btn-sm" data-act="nav" data-view="billing">Manage plan</button></div>`;
  } else {
    notice = `<div class="notice-card"><div><b>Turn on publishing</b>Pick a plan and pay with M-Pesa. Your drafts stay safe until you do.</div><button class="btn btn-sm" data-act="nav" data-view="billing">Choose a plan</button></div>`;
  }
  const recent = [...S.enquiries.map(x => ({ ...x, kind: 'enquiry' })), ...S.bookings.map(x => ({ ...x, kind: 'booking' }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  return `${notice}
  <div class="stats">
    <div class="stat"><b>${S.props.length}</b><span>Properties</span></div>
    <div class="stat"><b>${live}</b><span>Live now</span></div>
    <div class="stat"><b>${newE}</b><span>New enquiries</span></div>
    <div class="stat"><b>${newB}</b><span>New booking requests</span></div>
  </div>
  <div class="two-col">
    <section class="panel"><div class="panel-head"><h2>Latest messages</h2><button class="btn btn-ghost btn-sm" data-act="reload">${icon('refresh')} Refresh</button></div>
      ${recent.length ? recent.map(r => `<div class="rowline"><div><b>${esc(r.kind === 'booking' ? r.guest_name : r.sender_name)}</b><div class="sub">${esc((r.properties || {}).title || 'Property')} · ${dateText(r.created_at)}</div></div><div>${badge(REQ_STATUS[r.status] || ['', 'mute'])} <button class="btn btn-ghost btn-sm" data-act="nav" data-view="${r.kind === 'booking' ? 'bookings' : 'enquiries'}">Reply</button></div></div>`).join('') : empty('No messages yet', 'When someone asks about a listing, their WhatsApp number and email appear here.')}
    </section>
    <section class="panel"><div class="panel-head"><h2>Your properties</h2><button class="btn btn-ghost btn-sm" data-act="nav" data-view="properties">View all</button></div>
      ${S.props.length ? S.props.slice(0, 5).map(p => `<div class="rowline"><div><b>${esc(p.title)}</b><div class="sub">${esc(p.locality)}, ${esc(p.county)}</div></div>${badge(STATUS[p.status] || ['', 'mute'])}</div>`).join('') : empty('No properties yet', 'Add your first listing. Photos, a map pin and a clear price are all it needs.', '<button class="btn" data-act="nav" data-view="new">Add a property</button>')}
    </section>
  </div>`;
}

/* ---------- Properties ---------- */
function vProperties() {
  const tabs = [['all', 'All'], ['published', 'Live'], ['draft', 'Drafts'], ['archived', 'Archived'], ['rejected', 'Needs changes']];
  const list = S.props.filter(p => S.filter === 'all' || p.status === S.filter);
  return `<div class="filter-tabs">${tabs.map(([k, l]) => `<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${S.filter === k}">${l} (${k === 'all' ? S.props.length : S.props.filter(p => p.status === k).length})</button>`).join('')}
    <button class="btn btn-sm" style="margin-left:auto" data-act="newprop">${icon('plus')} Add property</button></div>
  <div class="prop-list">${list.length ? list.map(propRow).join('') : empty('Nothing here yet', S.filter === 'all' ? 'Add a property to get started.' : 'No properties with this status.', '<button class="btn" data-act="newprop">Add a property</button>')}</div>`;
}
function propRow(p) {
  const cover = coverOf(p), price = p.kind === 'stay' ? money(p.nightly_price) + ' / night' : money(p.monthly_price) + ' / month';
  const live = p.status === 'published', canDelete = ['draft', 'rejected', 'archived'].includes(p.status);
  return `<article class="prop">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : '<div class="ph"></div>'}
    <div><div>${badge(STATUS[p.status] || ['', 'mute'])} <span class="badge mute">${p.kind === 'stay' ? 'Short stay' : 'Rental'}</span></div>
      <h3>${esc(p.title)}</h3><div class="meta">${esc(p.locality)}, ${esc(p.county)} · ${price}</div>
      ${p.suspended_reason ? `<div class="meta" style="color:var(--danger)">Suspended by Nestify: ${esc(p.suspended_reason)}</div>` : ''}
      ${p.rejection_reason ? `<div class="meta" style="color:var(--danger)">${esc(p.rejection_reason)}</div>` : ''}</div>
    <div class="prop-actions">
      ${live ? `<a class="btn btn-ghost btn-sm" href="index.html?property=${esc(p.id)}" target="_blank" rel="noopener">${icon('eye')} View</a>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${esc(p.id)}">${icon('edit')} Edit</button>
      ${p.kind === 'stay' ? `<button class="btn btn-ghost btn-sm" data-act="dates" data-id="${esc(p.id)}">${icon('calendar')} Dates</button>` : ''}
      ${live ? `<button class="btn btn-ghost btn-sm" data-act="archive" data-id="${esc(p.id)}">Unpublish</button>` : (!p.suspended_at ? `<button class="btn btn-sm" data-act="publish" data-id="${esc(p.id)}">Publish</button>` : '')}
      ${canDelete ? `<button class="btn btn-ghost btn-sm" data-act="delete" data-id="${esc(p.id)}" aria-label="Delete">${icon('trash')}</button>` : ''}
    </div></article>`;
}
async function setStatus(id, status) {
  const p = propById(id); if (!p) return;
  if (status === 'published' && !canPublishMore(false)) { needPlan(); return; }
  const { error } = await db.from('properties').update({ status }).eq('id', id);
  if (error) { toast(dbError(error), 'err'); return; }
  toast(status === 'published' ? 'Your listing is live.' : 'Listing unpublished.', 'ok');
  await loadData(); render();
}
function needPlan() {
  if (!activeSub()) { toast('Choose a plan to publish. Your draft is saved.', 'err'); go('billing'); }
  else if (!S.agreement) { toast('Accept the agent agreement to publish.', 'err'); go('billing'); }
  else toast('You have used all the listing slots in your plan. Unpublish one or upgrade.', 'err');
}
async function deleteProperty(id) {
  const p = propById(id); if (!p || !confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
  const paths = (p.property_media || []).map(m => m.storage_path).filter(Boolean);
  const { error } = await db.from('properties').delete().eq('id', id);
  if (error) { toast(dbError(error), 'err'); return; }
  if (paths.length) await db.storage.from('property-media').remove(paths);
  toast('Property deleted.', 'ok'); await loadData(); render();
}

/* ---------- Property form ---------- */
function startNew() { S.editing = null; S.files = []; S.removed = new Set(); S.existing = []; go('new'); }
function startEdit(id) { const p = propById(id); if (!p) return; S.editing = p; S.files = []; S.removed = new Set(); S.existing = sortedMedia(p); go('new'); }
function vForm() {
  const p = S.editing || {}, e = !!S.editing, kind = p.kind || 'rent', am = new Set(p.amenities || []);
  const v = k => esc(p[k] ?? '');
  const c = caps();
  const live = p.status === 'published';
  return `<form id="propForm" class="form-wrap" data-form="property" novalidate>
    <div class="form-block"><h2>${e ? 'Edit property' : 'What are you listing?'}</h2>
      <div class="choice"><label><input type="radio" name="kind" value="rent" ${kind === 'rent' ? 'checked' : ''}><b>Long-term rental</b><span>Monthly rent. People enquire about viewings.</span></label>
      <label><input type="radio" name="kind" value="stay" ${kind === 'stay' ? 'checked' : ''}><b>Short stay or BnB</b><span>Nightly price. People request dates.</span></label></div>
      <div class="row2"><label class="fld"><span>Listing title</span><input name="title" required minlength="5" maxlength="120" value="${v('title')}" placeholder="Two-bedroom apartment near Yaya Centre"></label>
      <label class="fld"><span>Property type</span><select name="property_type" required><option value="">Choose a type</option>${PROPERTY_TYPES.map(t => `<option ${p.property_type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label></div>
      <label class="fld"><span>Description</span><textarea name="description" required minlength="40" maxlength="5000" placeholder="Layout, condition, utilities, access and what is included. Only claims you can stand behind.">${v('description')}</textarea><small>At least 40 characters.</small></label></div>

    <div class="form-block"><h2>Location</h2>
      <div class="row2"><label class="fld"><span>County</span><select name="county" required><option value="">Choose a county</option>${COUNTIES.map(x => `<option ${p.county === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="fld"><span>Area or neighbourhood</span><input name="locality" required value="${v('locality')}" placeholder="Kilimani"></label></div>
      <label class="fld"><span>Address or building</span><input id="addressInput" name="address_text" required value="${v('address_text')}" placeholder="Street, building name"><small id="mapsHint">${CFG.googleMapsApiKey ? 'Pick a suggestion, then drag the pin to the exact spot.' : 'Customers see the exact pin on a map. Add the coordinates below.'}</small></label>
      <div class="map-box"><div id="mapPicker" class="${CFG.googleMapsApiKey ? '' : 'hidden'}"></div><div id="mapPreview"></div>
        <div class="row3"><label class="fld"><span>Latitude</span><input id="latitude" name="latitude" type="number" step="0.000001" min="-5" max="5.5" required value="${v('latitude')}"></label>
        <label class="fld"><span>Longitude</span><input id="longitude" name="longitude" type="number" step="0.000001" min="33.5" max="42.5" required value="${v('longitude')}"></label>
        <label class="fld"><span>Or paste both</span><input id="coordPaste" placeholder="-1.2921, 36.8219"></label></div>
        <div class="contact-bar"><button type="button" class="btn btn-ghost btn-sm" data-act="geo">${icon('pin')} Use my current location</button><button type="button" class="btn btn-ghost btn-sm" data-act="findmap">${icon('external')} Find it on Google Maps</button><span class="consent">On Google Maps, right-click the spot and tap the coordinates to copy them.</span></div></div></div>

    <div class="form-block"><h2>Space and price</h2>
      <div class="row4"><label class="fld"><span>Bedrooms</span><input name="bedrooms" type="number" min="0" max="50" required value="${esc(p.bedrooms ?? 1)}"></label>
      <label class="fld"><span>Bathrooms</span><input name="bathrooms" type="number" min="1" max="50" required value="${esc(p.bathrooms ?? 1)}"></label>
      <label class="fld"><span>Size (m²)</span><input name="size_sqm" type="number" min="1" value="${v('size_sqm')}"></label>
      <label class="fld rent-only"><span>Monthly rent (KSh)</span><input name="monthly_price" type="number" min="1" value="${v('monthly_price')}"></label>
      <label class="fld stay-only"><span>Price per night (KSh)</span><input name="nightly_price" type="number" min="1" value="${v('nightly_price')}"></label></div>
      <div class="row2 stay-only"><label class="fld"><span>Most guests</span><input name="max_guests" type="number" min="1" max="100" value="${esc(p.max_guests ?? 2)}"></label>
      <label class="fld"><span>Fewest nights</span><input name="min_nights" type="number" min="1" max="365" value="${esc(p.min_nights ?? 1)}"></label></div>
      <h3 style="font-size:1.05rem">Amenities</h3><div class="amen-pick">${AMENITIES.map(a => `<button type="button" class="chip ${am.has(a) ? 'on' : ''}" data-act="amen" aria-pressed="${am.has(a)}">${esc(a)}</button>`).join('')}</div></div>

    <div class="form-block"><h2>Photos and video</h2>
      <p class="muted small">Use your own current photos. The first one is the cover. Your plan allows up to ${c.photos} photos and ${c.videos} video${c.videos > 1 ? 's' : ''} per listing. Photos are resized on your phone before upload.</p>
      <label class="upload"><input id="mediaInput" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple>${icon('plus')}<b>Add photos or a video</b><span class="muted small">JPG, PNG, WebP, MP4 or WebM · video up to ${MAX_VIDEO_MB} MB</span></label>
      <div id="mediaGrid" class="media-grid">${mediaGridHTML()}</div></div>

    <div class="form-bar"><p>${live ? 'This listing is live. Changes appear straight away.' : (canPublishMore() ? 'Ready to publish when you are.' : 'You can save a draft now and publish after you pick a plan.')}</p>
      ${e ? '<button type="button" class="btn btn-ghost" data-act="cancelform">Cancel</button>' : ''}
      ${live ? '<button type="button" class="btn" data-act="save" data-mode="keep">Save changes</button>'
        : '<button type="button" class="btn btn-ghost" data-act="save" data-mode="draft">Save draft</button><button type="button" class="btn" data-act="save" data-mode="publish">Publish</button>'}</div>
    <p class="form-msg" role="alert"></p></form>`;
}
function mediaGridHTML() {
  const old = S.existing.map(m => `<div class="media-item ${S.removed.has(m.id) ? 'gone' : ''}">${m.kind === 'video' ? `<video src="${esc(m.public_url)}" muted></video>` : `<img src="${esc(m.public_url)}" alt="">`}<button type="button" data-act="rmold" data-id="${esc(m.id)}" aria-label="${S.removed.has(m.id) ? 'Keep' : 'Remove'}">${icon(S.removed.has(m.id) ? 'refresh' : 'x')}</button></div>`);
  const added = S.files.map((f, i) => `<div class="media-item">${f.type.startsWith('video/') ? `<video src="${f.preview}" muted></video>` : `<img src="${f.preview}" alt="">`}<button type="button" data-act="rmnew" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>`);
  return old.concat(added).join('') || '<p class="muted small">No media yet.</p>';
}
function afterForm() {
  const f = $('#propForm'); toggleKind();
  f.addEventListener('change', e => { if (e.target.name === 'kind') toggleKind(); });
  $('#mediaInput').addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; });
  const refresh = debounce(updateMapPreview, 400);
  ['latitude', 'longitude'].forEach(id => $('#' + id).addEventListener('input', refresh));
  $('#coordPaste').addEventListener('input', e => {
    const m = e.target.value.match(/(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)/);
    if (m) { setCoords(Number(m[1]), Number(m[2])); }
  });
  updateMapPreview();
  if (CFG.googleMapsApiKey) loadGoogleMaps();
}
function toggleKind() {
  const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || 'rent';
  $$('.rent-only').forEach(x => x.classList.toggle('hidden', kind !== 'rent'));
  $$('.stay-only').forEach(x => x.classList.toggle('hidden', kind !== 'stay'));
}
function setCoords(lat, lng) {
  if (!(lat >= -5 && lat <= 5.5 && lng >= 33.5 && lng <= 42.5)) { toast('Those coordinates are outside Kenya. Check the order: latitude first, then longitude.', 'err'); return; }
  $('#latitude').value = lat.toFixed(6); $('#longitude').value = lng.toFixed(6); updateMapPreview();
  if (window._map) { const pt = { lat, lng }; window._map.setCenter(pt); window._marker.setPosition(pt); }
}
function updateMapPreview() {
  const box = $('#mapPreview'); if (!box) return;
  const lat = parseFloat($('#latitude').value), lng = parseFloat($('#longitude').value);
  if (CFG.googleMapsApiKey) { box.innerHTML = ''; return; }
  box.innerHTML = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -5 && lat <= 5.5 && lng >= 33.5 && lng <= 42.5
    ? `<iframe title="Map preview" loading="lazy" style="width:100%;height:240px;border:0;border-radius:16px" src="https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed"></iframe>`
    : '<div class="empty-state" style="padding:1.2rem">The map preview appears once you add coordinates.</div>';
}
function useGeo() {
  if (!navigator.geolocation) { toast('Your browser cannot share its location.', 'err'); return; }
  navigator.geolocation.getCurrentPosition(pos => { setCoords(pos.coords.latitude, pos.coords.longitude); toast('Location added. Drag the map pin if it is slightly off.', 'ok'); }, () => toast('Location permission was not given.', 'err'), { enableHighAccuracy: true, timeout: 12000 });
}
function findOnMap() {
  const f = $('#propForm'), q = [f.elements.address_text.value, f.elements.locality.value, f.elements.county.value, 'Kenya'].filter(Boolean).join(', ');
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), '_blank', 'noopener');
}
function loadGoogleMaps() {
  if (window.google && window.google.maps) return initMap();
  if (window._mapsLoading) return; window._mapsLoading = true;
  window.initAgentMap = initMap;
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CFG.googleMapsApiKey)}&libraries=places&callback=initAgentMap`;
  s.async = true; s.onerror = () => { window._mapsLoading = false; $('#mapPicker').classList.add('hidden'); updateMapPreview(); toast('Google Maps could not load. You can still enter coordinates.', 'err'); };
  document.head.appendChild(s);
}
function initMap() {
  const el = $('#mapPicker'); if (!el) return; el.classList.remove('hidden');
  const lat = parseFloat($('#latitude').value), lng = parseFloat($('#longitude').value);
  const centre = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: -1.286389, lng: 36.817223 };
  window._map = new google.maps.Map(el, { center: centre, zoom: Number.isFinite(lat) ? 16 : 11, mapTypeControl: false, streetViewControl: false });
  window._marker = new google.maps.Marker({ position: centre, map: window._map, draggable: true });
  window._marker.addListener('dragend', () => { const p = window._marker.getPosition(); $('#latitude').value = p.lat().toFixed(6); $('#longitude').value = p.lng().toFixed(6); });
  const ac = new google.maps.places.Autocomplete($('#addressInput'), { componentRestrictions: { country: 'ke' }, fields: ['formatted_address', 'geometry'] });
  ac.addListener('place_changed', () => {
    const pl = ac.getPlace(); if (!pl.geometry) return;
    const loc = pl.geometry.location; window._map.setCenter(loc); window._map.setZoom(17); window._marker.setPosition(loc);
    $('#latitude').value = loc.lat().toFixed(6); $('#longitude').value = loc.lng().toFixed(6);
    if (pl.formatted_address) $('#addressInput').value = pl.formatted_address;
  });
}

async function addFiles(list) {
  const c = caps();
  for (const file of list) {
    const isVid = file.type.startsWith('video/');
    if (!isVid && !file.type.startsWith('image/')) { toast(`${file.name} is not a photo or video.`, 'err'); continue; }
    const have = (kind) => S.existing.filter(m => m.kind === kind && !S.removed.has(m.id)).length + S.files.filter(f => (f.type.startsWith('video/') ? 'video' : 'image') === kind).length;
    if (isVid) {
      if (file.size > MAX_VIDEO_MB * 1048576) { toast(`${file.name} is over ${MAX_VIDEO_MB} MB. Trim or compress it first.`, 'err'); continue; }
      if (have('video') >= c.videos) { toast(`Your plan allows ${c.videos} video${c.videos > 1 ? 's' : ''} per listing.`, 'err'); continue; }
    } else if (have('image') >= c.photos) { toast(`Your plan allows ${c.photos} photos per listing.`, 'err'); break; }
    const item = file; item.preview = URL.createObjectURL(file); S.files.push(item);
  }
  $('#mediaGrid').innerHTML = mediaGridHTML();
}
async function shrinkImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file), max = 1800, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.84));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

async function saveProperty(mode) {
  const form = $('#propForm'), msg = $('.form-msg', form); msg.textContent = '';
  const fd = new FormData(form), kind = fd.get('kind');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  if (kind === 'rent' && !Number(fd.get('monthly_price'))) { msg.textContent = 'Enter the monthly rent.'; return; }
  if (kind === 'stay' && (!Number(fd.get('nightly_price')) || !Number(fd.get('max_guests')))) { msg.textContent = 'Enter the price per night and the most guests.'; return; }
  const keptMedia = S.existing.filter(m => !S.removed.has(m.id)).length + S.files.length;
  if (!keptMedia) { msg.textContent = 'Add at least one photo of the property.'; return; }

  const editing = S.editing, wasLive = editing && editing.status === 'published';
  let status = editing ? editing.status : 'draft';
  if (mode === 'draft') status = 'draft';
  if (mode === 'publish') { if (canPublishMore(wasLive)) status = 'published'; else { status = editing && editing.status === 'archived' ? 'archived' : 'draft'; } }
  const wantedPublish = mode === 'publish', blocked = wantedPublish && status !== 'published';
  const am = $$('#propForm .amen-pick .chip.on').map(x => x.textContent.trim());
  const row = {
    kind, status, title: String(fd.get('title')).trim(), description: String(fd.get('description')).trim(), property_type: fd.get('property_type'),
    county: fd.get('county'), locality: String(fd.get('locality')).trim(), address_text: String(fd.get('address_text')).trim(),
    latitude: Number(fd.get('latitude')), longitude: Number(fd.get('longitude')), bedrooms: Number(fd.get('bedrooms')), bathrooms: Number(fd.get('bathrooms')),
    size_sqm: fd.get('size_sqm') ? Number(fd.get('size_sqm')) : null,
    monthly_price: kind === 'rent' ? Number(fd.get('monthly_price')) : null, nightly_price: kind === 'stay' ? Number(fd.get('nightly_price')) : null,
    max_guests: kind === 'stay' ? Number(fd.get('max_guests')) : null, min_nights: kind === 'stay' ? Number(fd.get('min_nights') || 1) : null,
    furnished: am.includes('Furnished'), parking: am.includes('Parking'), pet_friendly: am.includes('Pet friendly'), pool: am.includes('Swimming pool'),
    wifi: am.includes('Wi-Fi / fibre'), security: am.includes('24-hour security'), amenities: am
  };
  const buttons = $$('.form-bar button', form); buttons.forEach(b => b.disabled = true);
  const done = () => buttons.forEach(b => b.disabled = false);
  try {
    let id = editing && editing.id;
    if (editing) { const { error } = await db.from('properties').update(row).eq('id', id); if (error) throw error; }
    else { const { data, error } = await db.from('properties').insert({ ...row, agent_id: S.user.id }).select('id').single(); if (error) throw error; id = data.id; }

    // Remove deleted media, then upload new files.
    const gone = S.existing.filter(m => S.removed.has(m.id));
    if (gone.length) { await db.from('property_media').delete().in('id', gone.map(m => m.id)); await db.storage.from('property-media').remove(gone.map(m => m.storage_path).filter(Boolean)); }
    let order = S.existing.filter(m => !S.removed.has(m.id)).length, failed = 0;
    for (let i = 0; i < S.files.length; i++) {
      msg.textContent = `Uploading ${i + 1} of ${S.files.length}…`;
      const file = await shrinkImage(S.files[i]), safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'), path = `${S.user.id}/${id}/${Date.now()}-${i}-${safe}`;
      const up = await db.storage.from('property-media').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { failed++; continue; }
      const url = db.storage.from('property-media').getPublicUrl(path).data.publicUrl;
      const ins = await db.from('property_media').insert({ property_id: id, agent_id: S.user.id, kind: file.type.startsWith('video/') ? 'video' : 'image', storage_path: path, public_url: url, alt_text: row.title, sort_order: order++ });
      if (ins.error) { failed++; await db.storage.from('property-media').remove([path]); toast(dbError(ins.error), 'err'); }
    }
    S.editing = null; S.files = []; S.removed = new Set(); S.existing = [];
    await loadData(); done();
    if (failed) toast(`Saved, but ${failed} file${failed > 1 ? 's' : ''} did not upload. Edit the listing to add ${failed > 1 ? 'them' : 'it'} again.`, 'err');
    if (blocked) { toast('Draft saved. Pick a plan to publish it.', 'err'); go('billing'); }
    else { if (!failed) toast(status === 'published' ? 'Saved. Your listing is live.' : 'Draft saved.', 'ok'); go('properties'); }
  } catch (e) { done(); msg.textContent = dbError(e); }
}

/* ---------- Blocked dates (short stays) ---------- */
async function openDates(id) {
  const p = propById(id); if (!p) return;
  const { data, error } = await db.from('blocked_dates').select('*').eq('property_id', id).gte('end_date', new Date().toISOString().slice(0, 10)).order('start_date');
  if (error) { toast(dbError(error), 'err'); return; }
  openDlg(`<h2 class="dlg-title">Blocked dates</h2><p class="muted">${esc(p.title)}. Block nights you cannot host, such as owner stays or bookings made elsewhere. Guests will not be able to request them.</p>
    <div style="margin-top:1rem">${(data || []).length ? data.map(d => `<div class="rowline"><div><b>${fmtDate(d.start_date)} to ${fmtDate(d.end_date)}</b><div class="sub">${esc(d.reason || 'Blocked')}</div></div><button class="btn btn-ghost btn-sm" data-act="unblock" data-id="${esc(d.id)}" data-p="${esc(id)}">Remove</button></div>`).join('') : '<p class="muted small">Nothing blocked yet.</p>'}</div>
    <form class="dlg-form" data-form="block" data-id="${esc(id)}" novalidate><div class="row2"><label class="fld"><span>First blocked night</span><input name="start" type="date" required min="${new Date().toISOString().slice(0, 10)}"></label><label class="fld"><span>Last blocked night</span><input name="end" type="date" required min="${new Date().toISOString().slice(0, 10)}"></label></div>
    <label class="fld"><span>Reason (only you see this)</span><input name="reason" maxlength="120" placeholder="Family visiting"></label>
    <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="closedlg">Close</button><button class="btn">Block these dates</button></div><p class="form-msg" role="alert"></p></form>`);
}
async function blockDates(form) {
  const fd = new FormData(form), s = fd.get('start'), e = fd.get('end');
  if (!s || !e || e < s) { formMsg(form, 'Choose a start date, then an end date on or after it.'); return; }
  const { error } = await db.from('blocked_dates').insert({ property_id: form.dataset.id, agent_id: S.user.id, start_date: s, end_date: e, reason: String(fd.get('reason') || '').trim() || null });
  if (error) { formMsg(form, dbError(error)); return; }
  toast('Dates blocked.', 'ok'); openDates(form.dataset.id);
}

/* ---------- Inbox: enquiries and booking requests ---------- */
function outreach(kind, r, title) {
  const name = firstName(kind === 'booking' ? r.guest_name : r.sender_name), me = S.profile.full_name || 'your host', agency = S.profile.agency_name ? ` from ${S.profile.agency_name}` : '';
  const extra = kind === 'booking' ? ` You asked about ${fmtDate(r.check_in)} to ${fmtDate(r.check_out)} for ${r.guests} guest${r.guests > 1 ? 's' : ''}.` : '';
  return `Hello ${name}, this is ${me}${agency}. Thank you for your ${kind === 'booking' ? 'booking request' : 'enquiry'} about "${title}" on Nestify.${extra} How can I help?`;
}
function contactBar(kind, r) {
  const phone = kind === 'booking' ? r.guest_phone : r.sender_phone, email = kind === 'booking' ? r.guest_email : r.sender_email, pref = r.preferred_contact || 'whatsapp';
  const title = (r.properties || {}).title || (propById(r.property_id) || {}).title || 'your property';
  const text = outreach(kind, r, title), common = `data-act="contacted" data-kind="${kind}" data-id="${esc(r.id)}"`;
  const wa = `<a class="btn btn-sm ${pref === 'whatsapp' ? 'btn-wa' : 'btn-ghost'}" href="${esc(waLink(phone, text))}" target="_blank" rel="noopener" ${common}>${icon('chat')} WhatsApp</a>`;
  const em = `<a class="btn btn-sm ${pref === 'email' ? '' : 'btn-ghost'}" href="${esc(mailLink(email, `Your ${kind === 'booking' ? 'booking request' : 'enquiry'} about ${title}`, text + `\n\nKind regards,\n${S.profile.full_name || ''}${S.profile.phone ? '\n' + S.profile.phone : ''}`))}" ${common}>${icon('mail')} Email</a>`;
  const ph = `<a class="btn btn-sm ${pref === 'phone' ? '' : 'btn-ghost'}" href="${esc(telLink(phone))}" ${common}>${icon('phone')} Call</a>`;
  const order = { whatsapp: [wa, em, ph], email: [em, wa, ph], phone: [ph, wa, em] }[pref] || [wa, em, ph];
  return `<div class="contact-bar">${order.join('')}<span class="consent">Prefers ${esc({ whatsapp: 'WhatsApp', email: 'email', phone: 'a phone call' }[pref] || 'WhatsApp')} · agreed to be contacted</span></div>`;
}
function vInbox(kind) {
  const list = kind === 'booking' ? S.bookings : S.enquiries;
  const intro = kind === 'booking'
    ? 'Short-stay requests. Reply on the guest’s preferred channel, then accept or decline the dates. Accepting blocks those nights.'
    : 'People asking about your rentals. They shared their WhatsApp number and email so you can talk one on one, outside Nestify.';
  return `<p class="muted" style="margin-bottom:1.1rem;max-width:46rem">${intro}</p><div class="inbox">${list.length ? list.map(r => reqCard(kind, r)).join('') : empty(kind === 'booking' ? 'No booking requests yet' : 'No enquiries yet', 'They appear here the moment someone sends one, and you also get a notification.')}</div>`;
}
function reqCard(kind, r) {
  const name = kind === 'booking' ? r.guest_name : r.sender_name, phone = kind === 'booking' ? r.guest_phone : r.sender_phone, email = kind === 'booking' ? r.guest_email : r.sender_email;
  const title = (r.properties || {}).title || (propById(r.property_id) || {}).title || 'Property';
  const foot = kind === 'booking'
    ? (r.status === 'accepted' ? '<span class="badge ok">Dates blocked for this guest</span>' : (['declined', 'closed'].includes(r.status) ? '' : `<button class="btn btn-sm" data-act="reqstatus" data-kind="booking" data-id="${esc(r.id)}" data-s="accepted">Accept dates</button><button class="btn btn-ghost btn-sm" data-act="reqstatus" data-kind="booking" data-id="${esc(r.id)}" data-s="declined">Decline</button>`))
    : (['closed'].includes(r.status) ? '' : `<button class="btn btn-ghost btn-sm" data-act="reqstatus" data-kind="enquiry" data-id="${esc(r.id)}" data-s="closed">Mark as done</button>`);
  return `<article class="req ${r.status === 'new' ? 'is-new' : ''}"><div class="req-head"><div><h3>${esc(name)}</h3><div class="meta">${esc(title)} · ${dateText(r.created_at)}</div></div>${badge(REQ_STATUS[r.status] || ['', 'mute'])}</div>
    ${kind === 'booking' ? `<dl><div><dt>Dates</dt><dd>${fmtDate(r.check_in)} to ${fmtDate(r.check_out)}</dd></div><div><dt>Guests</dt><dd>${r.guests}</dd></div><div><dt>Estimate</dt><dd>${money(r.total_quote)}</dd></div></dl>` : ''}
    ${r.message ? `<blockquote>${esc(r.message)}</blockquote>` : ''}
    <dl><div><dt>WhatsApp / phone</dt><dd>${esc(phone)}</dd></div><div><dt>Email</dt><dd>${esc(email)}</dd></div></dl>
    ${contactBar(kind, r)}<div class="req-foot">${foot}</div></article>`;
}
async function markContacted(kind, id) {
  const list = kind === 'booking' ? S.bookings : S.enquiries, r = list.find(x => x.id === id); if (!r || r.status !== 'new') return;
  const { error } = await db.from(kind === 'booking' ? 'booking_requests' : 'enquiries').update({ status: 'contacted' }).eq('id', id);
  if (!error) { r.status = 'contacted'; setTimeout(() => { if (['enquiries', 'bookings'].includes(S.view)) render(); }, 600); }
}
async function setReqStatus(kind, id, status) {
  if (status === 'declined' && !confirm('Decline this request?')) return;
  const { error } = await db.from(kind === 'booking' ? 'booking_requests' : 'enquiries').update({ status }).eq('id', id);
  if (error) { toast(dbError(error), 'err'); return; }
  toast(status === 'accepted' ? 'Dates accepted and blocked.' : 'Updated.', 'ok'); await loadData(); render();
}

/* ---------- Reviews ---------- */
function vReviews() {
  return `<p class="muted" style="margin-bottom:1.1rem;max-width:46rem">Anyone can review a live listing. Reply politely and factually. A good reply helps the next customer. You cannot edit or remove a review. If one breaks the rules, report it to Nestify.</p>
  <div class="inbox">${S.reviews.length ? S.reviews.map(r => `<article class="req"><div class="req-head"><div><h3>${stars(r.rating)} ${esc(r.title || '')}</h3><div class="meta">${esc(r.reviewer_name)} on ${esc((r.properties || {}).title || 'a property')} · ${dateText(r.created_at)}</div></div>${r.owner_response ? '<span class="badge ok">Replied</span>' : '<span class="badge warn">Needs a reply</span>'}</div>
    <blockquote>${esc(r.body)}</blockquote>
    <form class="reply-form" data-form="reply" data-id="${esc(r.id)}" novalidate><label class="fld"><span>${r.owner_response ? 'Your reply' : 'Reply publicly'}</span><textarea name="reply" maxlength="1000" placeholder="Thank you for staying with us…">${esc(r.owner_response || '')}</textarea></label><div class="req-foot"><button class="btn btn-sm">${r.owner_response ? 'Update reply' : 'Post reply'}</button></div><p class="form-msg" role="alert"></p></form></article>`).join('') : empty('No reviews yet', 'Reviews from customers show up here and on your listing.')}</div>`;
}
async function postReply(form) {
  const text = String(new FormData(form).get('reply') || '').trim();
  const { error } = await db.from('property_reviews').update({ owner_response: text || null }).eq('id', form.dataset.id);
  if (error) { formMsg(form, dbError(error)); return; }
  toast('Reply saved.', 'ok'); await loadData(); render();
}

/* ---------- Notifications ---------- */
function vNotes() {
  const target = { enquiry: 'enquiries', booking: 'bookings', review: 'reviews', billing: 'billing', approval: 'properties', rejection: 'properties' };
  return `<div class="panel-head"><p class="muted">The latest activity on your account.</p><button class="btn btn-ghost btn-sm" data-act="readall">Mark all as read</button></div>
  <div class="inbox">${S.notes.length ? S.notes.map(n => `<article class="req ${n.is_read ? '' : 'is-new'}"><div class="req-head"><div><h3>${esc(n.title)}</h3><div class="meta">${fmtDateTime(n.created_at)}</div></div>${target[n.type] ? `<button class="btn btn-ghost btn-sm" data-act="nav" data-view="${target[n.type]}">Open</button>` : ''}</div><p>${esc(n.body)}</p></article>`).join('') : empty('Nothing yet', 'You will see enquiries, bookings, reviews and billing updates here.')}</div>`;
}
async function readAll() {
  const { error } = await db.from('notifications').update({ is_read: true }).eq('user_id', S.user.id).eq('is_read', false);
  if (error) { toast(dbError(error), 'err'); return; }
  S.notes.forEach(n => n.is_read = true); render();
}

/* ---------- Subscription and M-Pesa ---------- */
function vBilling() {
  const sb = activeSub(), p = planOf(sb), latest = S.subs[0];
  const status = sb
    ? `<div class="notice-card ok"><div><b>${esc(p ? p.name : 'Your')} plan is active</b>${publishedCount()} of ${limitOf()} listing slots used. Active until ${fmtDate(sb.ends_at)}. Paying again adds a month on top.</div></div>`
    : `<div class="notice-card"><div><b>No active plan</b>Publishing is switched off until you subscribe. Drafts are safe, and listings go live right after your M-Pesa payment is confirmed.</div></div>`;
  const note = latest && ['failed', 'cancelled'].includes(latest.status) && !sb ? `<p class="form-msg" style="margin-bottom:1rem">Your last payment did not go through${latest.failure_reason ? ': ' + esc(latest.failure_reason) : ''}. No money was taken. You can try again.</p>` : '';
  return `${status}${note}<div class="plan-grid">${Object.entries(PLANS).map(([k, pl]) => `<article class="plan ${k === 'growth' ? 'pop' : ''}">${k === 'growth' ? '<span class="badge badge warn" style="position:absolute;right:1rem;top:-.7rem">Most popular</span>' : ''}<h3>${pl.name}</h3><div class="amt">${money(pl.amount)} <small>/ month</small></div><p class="muted small">${pl.blurb}</p><ul>${pl.perks.map(x => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul><button class="btn ${k === 'growth' ? '' : 'btn-ghost'}" data-act="plan" data-plan="${k}">${sb && sb.plan === k ? 'Renew ' + pl.name : 'Choose ' + pl.name}</button></article>`).join('')}</div>
  <section class="panel" style="margin-top:1.2rem"><h2>How it works</h2><p class="muted">1. Accept the agent agreement. 2. Choose a plan. 3. Approve the M-Pesa prompt on your phone. 4. Publish. We activate your plan only when Safaricom confirms the payment, so a success screen alone never counts.</p><p class="small" style="margin-top:.6rem"><a href="agreement.html" target="_blank" rel="noopener">Read the agent agreement</a></p></section>
  <section class="panel"><h2>Payment history</h2>${S.subs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th>M-Pesa receipt</th></tr></thead><tbody>${S.subs.map(s => `<tr><td>${fmtDate(s.created_at)}</td><td>${esc((planOf(s) || {}).name || s.plan)}</td><td>${money(s.amount_kes)}</td><td>${badge({ paid: ['Paid', 'ok'], pending: ['Waiting', 'warn'], initiated: ['Started', 'warn'], failed: ['Failed', 'bad'], cancelled: ['Cancelled', 'mute'], expired: ['Ended', 'mute'] }[s.status] || [s.status, 'mute'])}</td><td>${esc(s.mpesa_receipt_number || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No payments yet.</p>'}</section>`;
}
function choosePlan(key) { if (!S.agreement) openAgreement(key); else openPayment(key); }
function openAgreement(plan) {
  openDlg(`<h2 class="dlg-title">Agent agreement</h2><p class="muted">Version ${AGREEMENT_VERSION}. Please read it before you pay.</p>
  <div class="panel" style="margin-top:1rem;max-height:220px;overflow:auto;font-size:.9rem"><b>The short version</b><ul style="margin-top:.4rem;display:grid;gap:.4rem"><li>You are allowed to advertise every property you list, and your prices, photos, location and availability are accurate.</li><li>Customers who enquire agree that you may contact them on WhatsApp, email or phone. You use their details only to answer that enquiry or booking.</li><li>Anyone can review your listings. You will not buy, fake or pressure reviews.</li><li>Listings go live automatically while your plan is active. Nestify can remove or suspend a listing that breaks the rules.</li><li>Plans are paid monthly by M-Pesa and activate only after Safaricom confirms the payment.</li></ul><p style="margin-top:.6rem"><a href="agreement.html" target="_blank" rel="noopener">Open the full agreement</a></p></div>
  <form class="dlg-form" data-form="agreement" data-plan="${esc(plan)}" novalidate><label class="fld"><span>Your full legal name</span><input name="legal_name" required minlength="3" value="${esc(S.profile.full_name || '')}"></label>
  <label class="check"><input type="checkbox" name="a" required><span>I have read and accept agreement version ${AGREEMENT_VERSION}.</span></label>
  <label class="check"><input type="checkbox" name="b" required><span>I am responsible for the accuracy of my listings and for my authority to advertise them.</span></label>
  <label class="check"><input type="checkbox" name="c" required><span>I accept the prices and the M-Pesa payment and publishing rules.</span></label>
  <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="closedlg">Cancel</button><button class="btn">Accept and continue</button></div><p class="form-msg" role="alert"></p></form>`);
}
async function acceptAgreement(form) {
  const fd = new FormData(form);
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const { error } = await db.from('agent_agreements').insert({ agent_id: S.user.id, agreement_version: AGREEMENT_VERSION, legal_name: String(fd.get('legal_name')).trim(), accepted_terms: true, accepted_content_rules: true, accepted_payment_terms: true, user_agent: navigator.userAgent.slice(0, 400) });
  if (error && error.code !== '23505') { formMsg(form, dbError(error)); return; }
  S.agreement = { id: 'accepted' }; openPayment(form.dataset.plan);
}
function openPayment(key) {
  const pl = PLANS[key];
  openDlg(`<h2 class="dlg-title">Pay ${money(pl.amount)} with M-Pesa</h2><p class="muted">${pl.name} plan, one month. You will get a prompt on your phone. Enter your M-Pesa PIN only on that prompt, and never share it with anyone.</p>
  <form class="dlg-form" data-form="pay" data-plan="${key}" novalidate><label class="fld"><span>Safaricom number to pay from</span><input name="phone" type="tel" inputmode="tel" required value="${esc(S.profile.phone || '')}" placeholder="0712 345 678" autocomplete="tel"><small>The prompt goes to this number.</small></label>
  <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="closedlg">Cancel</button><button class="btn">${icon('lock')} Send M-Pesa prompt</button></div><p class="form-msg" role="alert"></p></form>`);
}
const payState = (kind, title, text, actions = '') => `<div class="pay-state">${kind === 'wait' ? '<div class="spinner"></div>' : `<div class="${kind === 'ok' ? 'good' : 'bad'}">${icon(kind === 'ok' ? 'check' : 'x')}</div>`}<h2 class="dlg-title" style="margin:0">${title}</h2><p class="muted">${text}</p>${actions}</div>`;
async function startPayment(form) {
  const key = form.dataset.plan, phone = toIntlPhone(new FormData(form).get('phone'));
  if (!/^254[17]\d{8}$/.test(phone)) { formMsg(form, 'Enter a Safaricom number, for example 0712 345 678.'); return; }
  openDlg(payState('wait', 'Sending the prompt…', 'This takes a few seconds.'));
  const { data, error } = await db.functions.invoke('daraja', { body: { action: 'start', plan: key, phone, idempotency_key: crypto.randomUUID() } });
  if (error || (data && data.error)) { const m = await fnError(error, data); openDlg(payState('bad', 'We could not start the payment', esc(m), `<div class="dlg-actions" style="justify-content:center"><button class="btn" data-act="plan" data-plan="${key}">Try again</button></div>`)); return; }
  S.pay = { checkout: data.checkoutRequestId, started: Date.now(), plan: key };
  openDlg(payState('wait', 'Check your phone', `Approve the M-Pesa prompt for ${money(PLANS[key].amount)} and enter your PIN. We are waiting for Safaricom to confirm. You can keep this window open.`));
  pollPayment();
}
async function pollPayment() {
  const pay = S.pay; if (!pay) return;
  if (Date.now() - pay.started > 4 * 60000) { openDlg(payState('wait', 'Still waiting for confirmation', 'If you approved the prompt, your plan will switch on as soon as Safaricom confirms. Check again in a minute.', '<div class="dlg-actions" style="justify-content:center"><button class="btn" data-act="checkpay">Check again</button><button class="btn btn-ghost" data-act="closedlg">Close</button></div>')); return; }
  const { data, error } = await db.functions.invoke('daraja', { body: { action: 'status' } });
  if (S.pay !== pay) return;
  const s = !error && data ? data.subscription : null;
  if (s && s.status === 'paid' && (!pay.checkout || s.mpesa_checkout_request_id === pay.checkout || new Date(s.created_at) >= new Date(pay.started - 60000))) {
    S.pay = null; await loadData(); render();
    openDlg(payState('ok', 'Payment received', `Your ${esc(PLANS[pay.plan].name)} plan is active until ${fmtDate(s.ends_at)}. You can publish now.`, '<div class="dlg-actions" style="justify-content:center"><button class="btn" data-act="closedlg">Done</button></div>')); return;
  }
  if (s && ['failed', 'cancelled'].includes(s.status) && s.mpesa_checkout_request_id === pay.checkout) {
    S.pay = null;
    openDlg(payState('bad', s.status === 'cancelled' ? 'Payment cancelled' : 'Payment did not go through', esc(s.failure_reason || 'No money was taken.') + ' You can try again.', `<div class="dlg-actions" style="justify-content:center"><button class="btn" data-act="plan" data-plan="${pay.plan}">Try again</button><button class="btn btn-ghost" data-act="closedlg">Close</button></div>`)); await loadData(); return;
  }
  pay.timer = setTimeout(pollPayment, 4000);
}

/* ---------- Profile ---------- */
function vProfile() {
  const p = S.profile, ver = { verified: ['Verified agent', 'ok'], pending: ['Verification pending', 'warn'], rejected: ['Not verified', 'bad'] }[p.verification_status] || ['', 'mute'];
  return `<form class="panel form-wrap" data-form="profile" novalidate><div style="display:flex;gap:.8rem;align-items:center;flex-wrap:wrap"><h2 style="margin:0">Your details</h2>${badge(ver)}</div>
  <p class="muted small">Customers see your name and agency on your listings. Your phone is what customers message on WhatsApp, so keep it current.</p>
  <div class="row2"><label class="fld"><span>Full name</span><input name="full_name" required minlength="2" value="${esc(p.full_name || '')}"></label><label class="fld"><span>Phone (WhatsApp)</span><input name="phone" type="tel" required value="${esc(p.phone || '')}"></label></div>
  <div class="row2"><label class="fld"><span>Agency or business</span><input name="agency_name" required value="${esc(p.agency_name || '')}"></label><label class="fld"><span>Licence or registration number</span><input name="license_number" value="${esc(p.license_number || '')}"></label></div>
  <label class="fld"><span>Email</span><input value="${esc(p.email || S.user.email || '')}" disabled><small>To change your email, contact Nestify support.</small></label>
  <div><button class="btn">Save details</button></div><p class="form-msg" role="alert"></p></form>`;
}
async function saveProfile(form) {
  const fd = new FormData(form), row = { full_name: String(fd.get('full_name')).trim(), phone: toIntlPhone(fd.get('phone')), agency_name: String(fd.get('agency_name')).trim(), license_number: String(fd.get('license_number') || '').trim() || null };
  const { error } = await db.from('profiles').update(row).eq('id', S.user.id);
  if (error) { formMsg(form, dbError(error)); return; }
  Object.assign(S.profile, row); toast('Details saved.', 'ok'); render();
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'A' && a === 'nav') e.preventDefault();
  switch (a) {
    case 'auth': showPane(el.dataset.pane); break;
    case 'logout': logout(); break;
    case 'side': $('#sidebar').classList.toggle('open'); break;
    case 'closedlg': closeDlg(); break;
    case 'nav': go(el.dataset.view); break;
    case 'reload': withBusy(el, 'Refreshing…', async () => { await loadData(); render(); }); break;
    case 'filter': S.filter = el.dataset.f; render(); break;
    case 'newprop': startNew(); break;
    case 'edit': startEdit(id); break;
    case 'dates': openDates(id); break;
    case 'unblock': db.from('blocked_dates').delete().eq('id', id).then(({ error }) => { if (error) toast(dbError(error), 'err'); else openDates(el.dataset.p); }); break;
    case 'publish': setStatus(id, 'published'); break;
    case 'archive': if (confirm('Unpublish this listing? It will disappear from the marketplace until you publish it again.')) setStatus(id, 'archived'); break;
    case 'delete': deleteProperty(id); break;
    case 'save': saveProperty(el.dataset.mode); break;
    case 'cancelform': S.editing = null; S.files = []; S.removed = new Set(); S.existing = []; go('properties'); break;
    case 'amen': { const on = !el.classList.contains('on'); el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on)); break; }
    case 'rmold': S.removed.has(id) ? S.removed.delete(id) : S.removed.add(id); $('#mediaGrid').innerHTML = mediaGridHTML(); break;
    case 'rmnew': S.files.splice(Number(el.dataset.i), 1); $('#mediaGrid').innerHTML = mediaGridHTML(); break;
    case 'geo': useGeo(); break;
    case 'findmap': findOnMap(); break;
    case 'contacted': markContacted(el.dataset.kind, id); break;
    case 'reqstatus': setReqStatus(el.dataset.kind, id, el.dataset.s); break;
    case 'readall': readAll(); break;
    case 'plan': choosePlan(el.dataset.plan); break;
    case 'checkpay': if (S.pay) { S.pay.started = Date.now(); } else { loadData().then(() => { render(); closeDlg(); }); } if (S.pay) { openDlg(payState('wait', 'Checking…', 'Asking Safaricom.')); pollPayment(); } break;
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const run = { login: authLogin, register: authRegister, forgot: authForgot, reset: authReset, block: blockDates, reply: postReply, agreement: acceptAgreement, pay: startPayment, profile: saveProfile }[f.dataset.form];
  if (run) run(f);
});
$('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) closeDlg(); });
$('#dlg').addEventListener('close', () => { if (S.pay && S.pay.timer) clearTimeout(S.pay.timer); });
window.addEventListener('hashchange', () => { if (S.user && !$('#appView').classList.contains('hidden')) { const v = location.hash.replace('#', ''); if (VIEWS[v] && v !== S.view) { S.view = v; render(); } } });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.user && Date.now() - S.lastLoad > 30000 && !['new'].includes(S.view) && !$('#dlg').open) loadData().then(render);
});
boot();
