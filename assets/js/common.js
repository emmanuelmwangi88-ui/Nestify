/* Shared helpers for the marketplace, agent portal and admin. */
const CFG = window.NESTIFY_CONFIG || {};
const LIVE = Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
const db = LIVE ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => 'KSh ' + Number(v || 0).toLocaleString('en-KE');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const dateText = d => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? days + ' days ago' : fmtDate(d);
};
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const readLS = (k, fallback = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

const COUNTIES = ['Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang’a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'];
const AMENITIES = ['Furnished', 'Parking', 'Pet friendly', 'Swimming pool', 'Wi-Fi / fibre', '24-hour security', 'Garden', 'Borehole', 'Solar power', 'Generator', 'Air conditioning', 'Accessible'];
const PROPERTY_TYPES = ['Apartment', 'Luxury Apartment', 'Penthouse', 'House', 'Villa', 'Townhouse', 'Serviced Apartment', 'Boutique Hotel', 'Resort', 'Lodge', 'Studio', 'Cottage', 'Bungalow', 'Maisonette'];

/* Icons: stroke paths on a 24px grid. */
const ICONS = {
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  mail: '<path d="M3 6h18v12H3zM3 7l9 7 9-7"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5h.01"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM6 12V6a2 2 0 0 1 3.5-1.3M7 19l-1 2M17 19l1 2"/>',
  area: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.5a6 6 0 0 1 3 5.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6"/>',
  flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  compare: '<path d="M8 4v16M16 4v16M4 8l4-4 4 4M12 16l4 4 4-4"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5"/>',
  home: '<path d="M3 11.5 12 4l9 7.5M6 10v10h12V10"/>',
  copy: '<path d="M8 8h11v12H8zM5 16V4h11"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('[data-icon]', root).forEach(el => { el.outerHTML = icon(el.dataset.icon); });

let toastTimer;
function toast(msg, kind = '') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
}

/* Phone and contact helpers. Kenyan numbers become 254XXXXXXXXX, matching the database. */
const digits = v => String(v || '').replace(/\D/g, '');
function toIntlPhone(raw) {
  const d = digits(raw);
  if (/^0[17]\d{8}$/.test(d)) return '254' + d.slice(1);
  if (/^[17]\d{8}$/.test(d)) return '254' + d;
  return d;
}
const waLink = (phone, text) => `https://wa.me/${toIntlPhone(phone)}?text=${encodeURIComponent(text)}`;
const mailLink = (to, subject, body) => `mailto:${encodeURIComponent(to).replace('%40', '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
const telLink = phone => 'tel:+' + toIntlPhone(phone);

/* Turn a failed Edge Function call into a readable message. */
async function fnError(error, data) {
  if (data && data.error) return data.error;
  try { const j = await error.context.json(); if (j && j.error) return j.error; } catch { /* no body */ }
  return (error && error.message) || 'Something went wrong. Please try again.';
}

/* Safe Supabase error text: guard triggers raise readable messages. */
function dbError(e) {
  const m = (e && e.message) || '';
  if (!m) return 'Something went wrong. Please try again.';
  if (/row-level security/i.test(m)) return 'You do not have permission to do that.';
  if (/duplicate key/i.test(m)) return 'That already exists.';
  if (/violates (check|foreign key|not-null)/i.test(m)) return 'Some details are missing or not valid. Check the form and try again.';
  return m;
}

function focusFirstError(form) {
  const bad = form.querySelector(':invalid');
  if (bad) { bad.focus(); return true; }
  return false;
}

document.addEventListener('DOMContentLoaded', () => hydrateIcons());
