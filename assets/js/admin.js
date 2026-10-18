/* Nestify admin console. Every action goes through an admin_* database function that checks the
   caller is an active admin and writes to the audit log. Shared helpers live in common.js. */

const VIEWS = {
  overview: ['Overview', 'home'], agents: ['Agents', 'users'], listings: ['Listings', 'grid'], reports: ['Reports', 'flag'],
  reviews: ['Reviews', 'star'], payments: ['Payments', 'card'], settings: ['Settings', 'edit'], audit: ['Audit log', 'list']
};
Object.assign(ICONS, {
  card: '<path d="M3 6h18v12H3zM3 10h18M7 15h3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/>'
});
const S = { user: null, me: null, view: 'overview', cache: {}, q: '', filter: '', entering: false };

const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'there';
const badge = (label, kind = 'mute') => `<span class="badge ${kind}">${esc(label)}</span>`;
const empty = (t, p) => `<div class="empty-state"><h3>${esc(t)}</h3><p>${esc(p)}</p></div>`;
const hideBoot = () => { const b = document.getElementById('boot'); if (b) b.remove(); };
const verKind = { verified: 'ok', pending: 'warn', rejected: 'bad' };
const statKind = { published: 'ok', pending: 'warn', draft: 'mute', rejected: 'bad', archived: 'mute' };

function openDlg(html) { $('#dlgBody').innerHTML = html; const d = $('#dlg'); if (!d.open) d.showModal(); }
function closeDlg() { const d = $('#dlg'); if (d.open) d.close(); }
function formMsg(form, text, ok = false) { const m = $('.form-msg', form); if (m) { m.textContent = text; m.classList.toggle('ok', ok); } }

async function rpc(name, args = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) { toast(error.code === '42501' ? 'Admin access required.' : dbError(error), 'err'); return null; }
  return data === null ? true : data;
}

/* ---------- Boot ---------- */
function gate(title, text, actions = '') {
  hideBoot(); $('#appView').classList.add('hidden'); $('#gate').classList.remove('hidden');
  $('#gateTitle').textContent = title; $('#gateText').textContent = text; $('#gateActions').innerHTML = actions;
}
async function boot() {
  if (!LIVE) { gate('Not connected', 'This site is not connected to its database yet.', '<a class="btn" href="index.html">Back to Nestify</a>'); return; }
  // Never await Supabase calls inside this callback (it would wait for the auth lock forever).
  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') setTimeout(() => { S.user = null; gate('Signed out', 'You have signed out.', '<a class="btn" href="agent.html">Sign in</a>'); }, 0);
  });
  const { data } = await db.auth.getSession();
  if (!data.session) { gate('Admin console', 'Sign in with your admin account first. Use the normal agent sign-in page, then come back here.', '<a class="btn" href="agent.html">Go to sign in</a>'); return; }
  S.user = data.session.user; await enter();
}
async function enter() {
  if (S.entering) return; S.entering = true;
  try {
    const r = await db.rpc('my_profile');
    const me = Array.isArray(r.data) ? r.data[0] : r.data;
    if (r.error || !me) { gate('Could not load your account', 'Please reload the page and try again.', '<button class="btn" onclick="location.reload()">Reload</button>'); return; }
    if (me.role !== 'admin' || me.account_status !== 'active') { gate('Admins only', 'This account does not have admin access.', '<a class="btn" href="agent.html">Back to my workspace</a>'); return; }
    S.me = me; hideBoot(); $('#gate').classList.add('hidden'); $('#appView').classList.remove('hidden');
    $('#whoName').textContent = me.full_name || 'Admin';
    $('#initials').textContent = (me.full_name || 'AD').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
    const v = (location.hash || '').replace('#', ''); go(VIEWS[v] ? v : 'overview', true);
  } catch (e) { console.error(e); gate('Something went wrong', 'Please reload the page.', '<button class="btn" onclick="location.reload()">Reload</button>'); }
  finally { S.entering = false; }
}

/* ---------- Shell ---------- */
async function go(view, first = false) {
  S.view = VIEWS[view] ? view : 'overview'; S.q = ''; S.filter = '';
  if (!first) history.replaceState(null, '', '#' + S.view);
  $('#pageTitle').textContent = VIEWS[S.view][0]; $('#sidebar').classList.remove('open');
  $('#nav').innerHTML = Object.entries(VIEWS).map(([k, [label, ic]]) => {
    const c = k === 'reports' && S.cache.openReports ? `<span class="count">${S.cache.openReports}</span>` : '';
    return `<a href="#${k}" data-act="nav" data-view="${k}" ${k === S.view ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${c}</a>`;
  }).join('');
  $('#view').innerHTML = '<div class="skeleton" style="min-height:240px"></div>';
  await load(S.view); draw();
}
async function load(v) {
  const k = {
    overview: async () => { S.cache.overview = await rpc('admin_overview'); if (S.cache.overview) S.cache.openReports = S.cache.overview.reports_open; },
    agents: async () => { S.cache.agents = (await rpc('admin_list_agents')) || []; },
    listings: async () => { S.cache.listings = (await rpc('admin_list_properties')) || []; },
    reports: async () => { S.cache.reports = (await rpc('admin_list_reports')) || []; },
    reviews: async () => { S.cache.reviews = (await rpc('admin_list_reviews')) || []; },
    payments: async () => { S.cache.payments = (await rpc('admin_list_payments')) || []; },
    settings: async () => { const { data } = await db.from('platform_settings').select('key,value'); S.cache.settings = Object.fromEntries((data || []).map(r => [r.key, r.value || {}])); },
    audit: async () => { S.cache.audit = (await rpc('admin_list_audit')) || []; }
  }[v];
  if (k) await k();
}
function draw() {
  $('#view').innerHTML = ({ overview: vOverview, agents: vAgents, listings: vListings, reports: vReports, reviews: vReviews, payments: vPayments, settings: vSettings, audit: vAudit })[S.view]();
}
const refresh = async () => { await load(S.view); draw(); };

const toolbar = (placeholder, filters = []) => `<div class="toolbar"><label class="fld"><span class="sr-only">Search</span><input type="search" data-input="q" placeholder="${esc(placeholder)}" value="${esc(S.q)}"></label>${filters.map(([k, l]) => `<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${S.filter === k}">${esc(l)}</button>`).join('')}<button class="btn btn-ghost btn-sm" data-act="refresh">${icon('list')} Refresh</button></div>`;
const match = (obj, q) => !q || Object.values(obj).some(v => String(v ?? '').toLowerCase().includes(q.toLowerCase()));
const table = (head, rows) => rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : empty('Nothing here', 'No records match.');

/* ---------- Views ---------- */
function vOverview() {
  const o = S.cache.overview; if (!o) return empty('Could not load', 'Check the migration was applied, then refresh.');
  const st = [[o.agents_total, 'Agents'], [o.agents_pending, 'Awaiting verification'], [o.agents_verified, 'Verified agents'], [o.agents_suspended, 'Suspended accounts'],
    [o.properties_live, 'Live listings'], [o.properties_total, 'All listings'], [o.active_subscriptions, 'Active plans'], [money(o.revenue_30d), 'Revenue, 30 days'],
    [money(o.revenue_total), 'Revenue, all time'], [o.reports_open, 'Open reports'], [o.enquiries_7d, 'Enquiries, 7 days'], [o.bookings_7d, 'Booking requests, 7 days']];
  return `<div class="stats">${st.map(([n, l]) => `<div class="stat"><b>${esc(n)}</b><span>${l}</span></div>`).join('')}</div>
  <div class="two-col"><section class="panel"><h2>Needs attention</h2>
    <div class="rowline"><div><b>${o.agents_pending}</b> agents waiting to be verified</div><button class="btn btn-ghost btn-sm" data-act="nav" data-view="agents">Review</button></div>
    <div class="rowline"><div><b>${o.reports_open}</b> open listing reports</div><button class="btn btn-ghost btn-sm" data-act="nav" data-view="reports">Review</button></div></section>
  <section class="panel"><h2>Quick links</h2><div class="actions-row"><button class="btn btn-sm" data-act="nav" data-view="agents">Manage agents</button><button class="btn btn-ghost btn-sm" data-act="nav" data-view="listings">All listings</button><button class="btn btn-ghost btn-sm" data-act="nav" data-view="payments">Payments</button><button class="btn btn-ghost btn-sm" data-act="nav" data-view="settings">Settings</button></div></section></div>`;
}

function vAgents() {
  const list = (S.cache.agents || []).filter(a => match({ n: a.full_name, e: a.email, p: a.phone, a: a.agency_name }, S.q) && (!S.filter || a.verification_status === S.filter || (S.filter === 'suspended' && a.account_status === 'suspended') || (S.filter === 'paying' && a.plan)));
  return toolbar('Search name, email, phone or agency', [['pending', 'Pending'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['suspended', 'Suspended'], ['paying', 'On a plan']]) +
    table(['Agent', 'Contact', 'Status', 'Listings', 'Plan', 'Joined', ''], list.map(a => `<tr><td><b>${esc(a.full_name || 'No name')}</b><span class="sub">${esc(a.agency_name || '')}${a.role === 'admin' ? ' · admin' : ''}</span></td>
      <td>${esc(a.email)}<span class="sub">${esc(a.phone || '')}</span></td>
      <td>${badge(a.verification_status, verKind[a.verification_status])} ${a.account_status === 'suspended' ? badge('Suspended', 'bad') : ''}</td>
      <td>${a.live_count} live / ${a.properties_count}</td><td>${a.plan ? `${esc(a.plan)}<span class="sub">to ${fmtDate(a.plan_ends_at)}</span>` : '<span class="muted">None</span>'}</td>
      <td>${fmtDate(a.created_at)}</td><td class="actions"><button class="btn btn-ghost btn-sm" data-act="agent" data-id="${esc(a.id)}">Manage</button></td></tr>`));
}
function openAgent(id) {
  const a = (S.cache.agents || []).find(x => x.id === id); if (!a) return;
  const self = a.id === S.me.id;
  openDlg(`<h2 class="dlg-title">${esc(a.full_name || 'Agent')}</h2><p class="muted">${esc(a.agency_name || '')}</p>
  <dl class="kv"><div><dt>Email</dt><dd>${esc(a.email)}</dd></div><div><dt>Phone</dt><dd>${esc(a.phone || '')}</dd></div><div><dt>Licence</dt><dd>${esc(a.license_number || 'Not given')}</dd></div>
  <div><dt>Verification</dt><dd>${esc(a.verification_status)}</dd></div><div><dt>Account</dt><dd>${esc(a.account_status)}</dd></div>
  <div><dt>Listings</dt><dd>${a.live_count} live of ${a.properties_count}</dd></div><div><dt>Plan</dt><dd>${a.plan ? esc(a.plan) + ' to ' + fmtDate(a.plan_ends_at) : 'None'}</dd></div></dl>
  ${a.phone ? `<div class="actions-row"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waLink(a.phone, 'Hello ' + firstName(a.full_name) + ', this is Nestify support.'))}">${icon('chat')} WhatsApp</a><a class="btn btn-ghost btn-sm" href="${esc(mailLink(a.email, 'Nestify', ''))}">${icon('mail')} Email</a></div>` : ''}
  <form class="dlg-form" data-form="agent" data-id="${esc(a.id)}" novalidate>
    <label class="fld"><span>Private admin notes (only admins see this)</span><textarea name="notes" maxlength="2000">${esc(a.admin_notes || '')}</textarea></label>
    <label class="fld"><span>Reason or message to the agent (for verification, suspension or rejection)</span><input name="reason" maxlength="300" placeholder="Optional"></label>
    <div class="actions-row">
      <button class="btn btn-sm" data-do="verify">Verify</button>
      <button class="btn btn-ghost btn-sm" data-do="pending">Set pending</button>
      <button class="btn btn-ghost btn-sm danger" data-do="reject">Reject</button>
      ${a.account_status === 'suspended' ? '<button class="btn btn-sm" data-do="activate">Reactivate account</button>' : `<button class="btn btn-ghost btn-sm danger" data-do="suspend" ${self ? 'disabled' : ''}>Suspend account</button>`}
      <button class="btn btn-ghost btn-sm" data-do="notes">Save notes only</button>
    </div>
    <p class="form-msg" role="alert"></p></form>
  <hr style="border:0;border-top:1px solid rgba(0,0,0,.08);margin:1rem 0">
  <form class="dlg-form" data-form="grant" data-id="${esc(a.id)}" novalidate><h3 style="font-size:1.05rem;margin:0">Plan</h3>
    <div class="row3"><label class="fld"><span>Plan</span><select name="plan"><option value="starter">Starter</option><option value="growth">Growth</option><option value="elite">Elite</option></select></label>
    <label class="fld"><span>Months</span><input name="months" type="number" min="1" max="12" value="1"></label>
    <label class="fld"><span>Reason</span><input name="reason" placeholder="Paid offline, courtesy…"></label></div>
    <div class="actions-row"><button class="btn btn-sm">Grant plan</button>${a.plan ? `<button type="button" class="btn btn-ghost btn-sm danger" data-act="endplan" data-id="${esc(a.id)}">End current plan</button>` : ''}</div><p class="form-msg" role="alert"></p></form>
  ${self ? '' : `<div class="actions-row"><button class="btn btn-ghost btn-sm ${a.role === 'admin' ? 'danger' : ''}" data-act="role" data-id="${esc(a.id)}" data-role="${a.role === 'admin' ? 'agent' : 'admin'}">${a.role === 'admin' ? 'Remove admin access' : 'Make this person an admin'}</button></div>`}`);
}
async function saveAgent(form, how) {
  const fd = new FormData(form), notes = String(fd.get('notes') || ''), reason = String(fd.get('reason') || '');
  const map = { verify: { p_verification: 'verified' }, pending: { p_verification: 'pending' }, reject: { p_verification: 'rejected' }, activate: { p_account: 'active' }, suspend: { p_account: 'suspended' }, notes: {} }[how] || {};
  if (how === 'suspend' && !confirm('Suspend this account? All of their listings are hidden immediately.')) return;
  const ok = await rpc('admin_set_agent', { p_agent: form.dataset.id, p_notes: notes, p_reason: reason, ...map });
  if (ok) { toast('Saved.', 'ok'); closeDlg(); refresh(); }
}
async function grantPlan(form) {
  const fd = new FormData(form);
  if (!confirm(`Give this agent the ${fd.get('plan')} plan for ${fd.get('months')} month(s) without a payment?`)) return;
  const ok = await rpc('admin_grant_subscription', { p_agent: form.dataset.id, p_plan: fd.get('plan'), p_months: Number(fd.get('months')), p_reason: String(fd.get('reason') || '') });
  if (ok) { toast('Plan granted.', 'ok'); closeDlg(); refresh(); }
}

function vListings() {
  const list = (S.cache.listings || []).filter(p => match({ t: p.title, a: p.agent_name, c: p.county, l: p.locality }, S.q) && (!S.filter || p.status === S.filter || (S.filter === 'suspended' && p.suspended_at)));
  return toolbar('Search title, agent or area', [['published', 'Live'], ['draft', 'Drafts'], ['archived', 'Archived'], ['rejected', 'Rejected'], ['suspended', 'Suspended']]) +
    table(['Listing', 'Agent', 'Status', 'Price', 'Added', ''], list.map(p => `<tr><td><b>${esc(p.title)}</b><span class="sub">${esc(p.locality)}, ${esc(p.county)} · ${p.kind === 'stay' ? 'Short stay' : 'Rental'}</span></td>
      <td>${esc(p.agent_name || '')}<span class="sub">${esc(p.agency_name || '')}</span></td>
      <td>${badge(p.status, statKind[p.status])} ${p.suspended_at ? badge('Suspended', 'bad') : ''}</td><td>${money(p.price)}${p.kind === 'stay' ? '<span class="sub">per night</span>' : '<span class="sub">per month</span>'}</td><td>${fmtDate(p.created_at)}</td>
      <td class="actions">${p.status === 'published' ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="index.html?property=${esc(p.id)}">View</a>` : ''}<button class="btn btn-ghost btn-sm" data-act="listing" data-id="${esc(p.id)}">Manage</button></td></tr>`));
}
function openListing(id) {
  const p = (S.cache.listings || []).find(x => x.id === id); if (!p) return;
  openDlg(`<h2 class="dlg-title">${esc(p.title)}</h2><p class="muted">${esc(p.agent_name || '')} · ${esc(p.locality)}, ${esc(p.county)}</p>
  <dl class="kv"><div><dt>Status</dt><dd>${esc(p.status)}${p.suspended_at ? ' (suspended)' : ''}</dd></div><div><dt>Price</dt><dd>${money(p.price)}</dd></div>${p.suspended_reason ? `<div><dt>Suspension reason</dt><dd>${esc(p.suspended_reason)}</dd></div>` : ''}</dl>
  <form class="dlg-form" data-form="listing" data-id="${esc(p.id)}" novalidate>
    <label class="fld"><span>Reason (shown to the agent for suspend and reject)</span><input name="reason" maxlength="300" placeholder="For example: photos do not match the property"></label>
    <div class="actions-row">
      ${p.suspended_at ? '<button class="btn btn-sm" data-do="unsuspend">Lift suspension</button>' : '<button class="btn btn-ghost btn-sm danger" data-do="suspend">Suspend and remove</button>'}
      <button class="btn btn-ghost btn-sm" data-do="reject">Send back for changes</button>
      <button class="btn btn-ghost btn-sm" data-do="archive">Unpublish</button>
      <button class="btn btn-ghost btn-sm danger" data-do="delete">Delete permanently</button>
    </div><p class="form-msg" role="alert"></p></form>`);
}
async function actListing(form, how) {
  if (how === 'delete' && !confirm('Delete this listing and its media record forever?')) return;
  const ok = await rpc('admin_set_property', { p_id: form.dataset.id, p_action: how, p_reason: String(new FormData(form).get('reason') || '') });
  if (ok) { toast('Done.', 'ok'); closeDlg(); refresh(); }
}

function vReports() {
  const list = (S.cache.reports || []).filter(r => match({ t: r.property_title, n: r.reporter_name, e: r.reporter_email, d: r.details }, S.q) && (!S.filter || r.status === S.filter));
  return toolbar('Search reports', [['open', 'Open'], ['investigating', 'Investigating'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']]) +
    (list.length ? `<div class="inbox">${list.map(r => `<article class="req ${r.status === 'open' ? 'is-new' : ''}"><div class="req-head"><div><h3>${esc((r.category || '').replace(/_/g, ' '))} · ${esc(r.property_title || 'Removed listing')}</h3><div class="meta">Agent ${esc(r.agent_name || '')} · reported by ${esc(r.reporter_name)} (${esc(r.reporter_email)}) · ${dateText(r.created_at)}</div></div>${badge(r.status, r.status === 'open' ? 'warn' : r.status === 'resolved' ? 'ok' : 'mute')}</div>
      <div class="report-text">${esc(r.details)}</div>${r.admin_resolution ? `<p class="small muted">Resolution: ${esc(r.admin_resolution)}</p>` : ''}
      <div class="req-foot"><button class="btn btn-sm" data-act="report" data-id="${esc(r.id)}">Handle</button>${r.property_id ? `<button class="btn btn-ghost btn-sm" data-act="listing" data-id="${esc(r.property_id)}">Open listing</button>` : ''}</div></article>`).join('')}</div>` : empty('No reports', 'Nothing matches this filter.'));
}
function openReport(id) {
  const r = (S.cache.reports || []).find(x => x.id === id); if (!r) return;
  openDlg(`<h2 class="dlg-title">Handle report</h2><p class="muted">${esc(r.property_title || '')}</p><div class="report-text">${esc(r.details)}</div>
  <form class="dlg-form" data-form="report" data-id="${esc(r.id)}" novalidate><label class="fld"><span>Resolution note</span><textarea name="note" maxlength="1000">${esc(r.admin_resolution || '')}</textarea></label>
  <div class="actions-row"><button class="btn btn-ghost btn-sm" data-do="investigating">Mark investigating</button><button class="btn btn-sm" data-do="resolved">Resolved</button><button class="btn btn-ghost btn-sm" data-do="dismissed">Dismiss</button></div><p class="form-msg" role="alert"></p></form>`);
}
async function actReport(form, how) {
  const ok = await rpc('admin_resolve_report', { p_id: form.dataset.id, p_status: how, p_resolution: String(new FormData(form).get('note') || '') });
  if (ok) { toast('Report updated.', 'ok'); closeDlg(); refresh(); }
}

function vReviews() {
  const list = (S.cache.reviews || []).filter(r => match({ t: r.property_title, n: r.reviewer_name, b: r.body }, S.q) && (!S.filter || (S.filter === 'hidden' ? r.is_hidden : !r.is_hidden)));
  return toolbar('Search reviews', [['visible', 'Visible'], ['hidden', 'Hidden']]) +
    (list.length ? `<div class="inbox">${list.map(r => `<article class="req"><div class="req-head"><div><h3>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} ${esc(r.title || '')}</h3><div class="meta">${esc(r.reviewer_name)} on ${esc(r.property_title || 'a listing')} · ${dateText(r.created_at)}</div></div>${r.is_hidden ? badge('Hidden', 'bad') : badge('Visible', 'ok')}</div>
      <blockquote>${esc(r.body)}</blockquote>${r.owner_response ? `<p class="small muted">Agent reply: ${esc(r.owner_response)}</p>` : ''}
      <div class="req-foot"><button class="btn btn-ghost btn-sm ${r.is_hidden ? '' : 'danger'}" data-act="hidereview" data-id="${esc(r.id)}" data-hidden="${r.is_hidden ? 'false' : 'true'}">${r.is_hidden ? 'Show again' : 'Hide review'}</button></div></article>`).join('')}</div>` : empty('No reviews', 'Nothing matches.'));
}

function vPayments() {
  const list = (S.cache.payments || []).filter(p => match({ n: p.agent_name, e: p.agent_email, r: p.mpesa_receipt_number, ph: p.phone }, S.q) && (!S.filter || p.status === S.filter));
  const kind = { paid: 'ok', failed: 'bad', cancelled: 'mute', pending: 'warn', initiated: 'warn', expired: 'mute' };
  return toolbar('Search agent, receipt or phone', [['paid', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['cancelled', 'Cancelled']]) +
    table(['Date', 'Agent', 'Plan', 'Amount', 'Status', 'M-Pesa receipt', 'Ends'], list.map(p => `<tr><td>${fmtDateTime(p.created_at)}</td><td><b>${esc(p.agent_name || '')}</b><span class="sub">${esc(p.agent_email || '')}</span></td><td>${esc(p.plan)}</td><td>${money(p.amount_kes)}</td>
      <td>${badge(p.status, kind[p.status])}${p.failure_reason ? `<span class="sub">${esc(p.failure_reason)}</span>` : ''}</td><td>${esc(p.mpesa_receipt_number || '')}</td><td>${p.ends_at ? fmtDate(p.ends_at) : ''}</td></tr>`));
}

function vSettings() {
  const s = S.cache.settings || {}, sup = s.support_contact || {}, ms = s.marketplace_status || {};
  const DEF = { starter: [2500, 3], growth: [6500, 12], elite: [15000, 40] }, pl = s.plans || {};
  const plans = `<form class="panel form-wrap" data-form="plans" novalidate><h2>Plan prices</h2><p class="muted small">Whole shillings per month, and how many live listings each plan allows. The change applies to the next payment straight away. M-Pesa needs at least KSh 1.</p>
    ${Object.keys(DEF).map(k => `<div class="row-2"><label class="fld"><span>${k[0].toUpperCase() + k.slice(1)} price (KSh)</span><input name="${k}_amount" type="number" min="1" max="1000000" step="1" required value="${esc(String((pl[k] || {}).amount || DEF[k][0]))}"></label>
    <label class="fld"><span>Listing limit</span><input name="${k}_limit" type="number" min="1" max="1000" step="1" required value="${esc(String((pl[k] || {}).limit || DEF[k][1]))}"></label></div>`).join('')}
    <div><button class="btn">Save prices</button></div><p class="form-msg" role="alert"></p></form>`;
  return plans + `<div class="two-col"><form class="panel form-wrap" data-form="support" novalidate><h2>Support contact</h2><p class="muted small">Shown in the site footer.</p>
    <label class="fld"><span>Support email</span><input name="email" type="email" required value="${esc(sup.email || '')}"></label>
    <label class="fld"><span>Support WhatsApp number (optional)</span><input name="phone" type="tel" value="${esc(sup.phone || '')}" placeholder="0712 345 678"></label>
    <div><button class="btn">Save</button></div><p class="form-msg" role="alert"></p></form>
  <form class="panel form-wrap" data-form="status" novalidate><h2>Marketplace</h2>
    <label class="check"><input type="checkbox" name="maintenance" ${ms.maintenance ? 'checked' : ''}><span>Show a maintenance notice on the marketplace</span></label>
    <label class="check"><input type="checkbox" name="accepting" ${ms.accepting_listings !== false ? 'checked' : ''}><span>Agents may publish new listings</span></label>
    <div><button class="btn">Save</button></div><p class="form-msg" role="alert"></p></form></div>`;
}
async function saveSetting(key, value, form) {
  const { error } = await db.from('platform_settings').update({ value, updated_by: S.user.id, updated_at: new Date().toISOString() }).eq('key', key);
  if (error) { formMsg(form, dbError(error)); return; }
  await db.from('admin_audit_logs').insert({ admin_id: S.user.id, action: 'settings.update', entity_type: 'setting', entity_id: key, after_data: value });
  toast('Saved.', 'ok'); refresh();
}

function vAudit() {
  return table(['When', 'Admin', 'Action', 'Item', 'Reason'], (S.cache.audit || []).map(a => `<tr><td>${fmtDateTime(a.created_at)}</td><td>${esc(a.admin_name || '')}</td><td>${esc(a.action)}</td><td>${esc(a.entity_type)}<span class="sub">${esc(String(a.entity_id || '').slice(0, 8))}</span></td><td>${esc(a.reason || '')}</td></tr>`));
}

/* ---------- Events ---------- */
document.addEventListener('click', async e => {
  const doBtn = e.target.closest('[data-do]');
  if (doBtn) { // buttons inside dialog forms
    e.preventDefault(); const f = doBtn.closest('form'), how = doBtn.dataset.do;
    ({ agent: saveAgent, listing: actListing, report: actReport })[f.dataset.form]?.(f, how); return;
  }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'A' && a === 'nav') e.preventDefault();
  if (a === 'nav') go(el.dataset.view);
  else if (a === 'logout') { await db.auth.signOut(); }
  else if (a === 'side') $('#sidebar').classList.toggle('open');
  else if (a === 'closedlg') closeDlg();
  else if (a === 'refresh') refresh();
  else if (a === 'filter') { S.filter = S.filter === el.dataset.f ? '' : el.dataset.f; draw(); }
  else if (a === 'agent') openAgent(id);
  else if (a === 'listing') openListing(id);
  else if (a === 'report') openReport(id);
  else if (a === 'endplan') { if (confirm('End this agent’s current plan now? Their listings go offline.')) { if (await rpc('admin_end_subscription', { p_agent: id, p_reason: 'Ended by admin' })) { toast('Plan ended.', 'ok'); closeDlg(); refresh(); } } }
  else if (a === 'role') { if (confirm(el.dataset.role === 'admin' ? 'Give this person full admin access?' : 'Remove admin access?')) { if (await rpc('admin_set_role', { p_agent: id, p_role: el.dataset.role })) { toast('Role updated.', 'ok'); closeDlg(); refresh(); } } }
  else if (a === 'hidereview') { if (await rpc('admin_hide_review', { p_id: id, p_hidden: el.dataset.hidden === 'true' })) { toast('Updated.', 'ok'); refresh(); } }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const fd = new FormData(f);
  if (f.dataset.form === 'grant') grantPlan(f);
  else if (f.dataset.form === 'plans') {
    const v = {}; for (const k of ['starter', 'growth', 'elite']) v[k] = { amount: Number(fd.get(k + '_amount')), limit: Number(fd.get(k + '_limit')) };
    rpc('admin_set_plans', { p_plans: v }).then(ok => { if (ok !== false && ok !== null && ok !== undefined) { toast('Prices saved.', 'ok'); refresh(); } });
  }
  else if (f.dataset.form === 'support') saveSetting('support_contact', { email: String(fd.get('email')).trim(), phone: String(fd.get('phone') || '').trim() }, f);
  else if (f.dataset.form === 'status') saveSetting('marketplace_status', { maintenance: !!fd.get('maintenance'), accepting_listings: !!fd.get('accepting') }, f);
});
document.addEventListener('input', debounce(e => { if (e.target.dataset && e.target.dataset.input === 'q') { S.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('[data-input="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } }, 200));
$('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) closeDlg(); });
window.addEventListener('hashchange', () => { const v = location.hash.replace('#', ''); if (S.me && VIEWS[v] && v !== S.view) go(v, true); });
boot();
