/* Auth + user state (Supabase). Depends on app.js globals: $, route */
const CFG = window.GCI_CONFIG || {};
const BACKEND = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && typeof supabase !== 'undefined');
const sb = BACKEND ? supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY,
  { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const S = { ready: false, user: null, profile: null, enr: new Set(), prog: {}, certs: [], lids: {}, lessons: {}, ll: {} };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const base = () => location.origin + '/';
function toast(msg, type) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] px-4 py-3 rounded-lg shadow-xl text-sm font-semibold text-white ' + (type === 'err' ? 'bg-red-600' : 'bg-slate-800');
  el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3800);
}
function say(sel, msg, ok) {
  const el = $(sel); if (!el) return;
  el.textContent = msg; el.hidden = !msg;
  el.className = 'text-sm rounded-lg px-3 py-2 ' + (ok ? 'bg-teal-50 text-t' : 'bg-red-50 text-red-700');
}
function busy(b, on) {
  if (!b) return;
  if (on) { b.dataset.t = b.textContent; b.textContent = 'Please wait…'; b.disabled = true; }
  else { b.textContent = b.dataset.t || b.textContent; b.disabled = false; }
}
function friendly(e) {
  const raw = (e && e.message) || '', t = raw.toLowerCase();
  if (raw.startsWith('GCI: ')) return raw.slice(5);
  if (t.includes('invalid login')) return 'Incorrect email or password.';
  if (t.includes('already') && t.includes('registered')) return 'This email is already registered. Please log in.';
  if (t.includes('email not confirmed')) return 'Please confirm your email first (check your inbox and spam folder).';
  if (t.includes('rate limit') || t.includes('too many') || t.includes('security purposes')) return 'Too many attempts. Please wait a minute and try again.';
  if (t.includes('same password') || t.includes('weak') || t.includes('password should')) return raw;
  if (t.includes('fetch') || t.includes('network')) return 'Network error. Please check your internet connection.';
  return 'Something went wrong. Please try again.';
}

async function loadUser() {
  S.lessons = {}; S.ll = {};
  if (typeof LV !== 'undefined') LV.list = null;
  if (typeof NT !== 'undefined') NT.mine = null;
  if (!S.user) { Object.assign(S, { profile: null, enr: new Set(), prog: {}, certs: [], lids: {} }); return; }
  const [p, e, l, c, ls] = await Promise.all([
    sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(),
    sb.from('enrollments').select('course_id'),
    sb.from('lesson_progress').select('course_id,lesson_id'),
    sb.from('certificates').select('*').order('issued_at', { ascending: false }),
    sb.from('lessons').select('id,course_id')]);
  if (p.error || e.error || l.error || c.error || ls.error) toast('Could not load your data. Please refresh the page.', 'err');
  S.profile = p.data; S.enr = new Set((e.data || []).map(r => r.course_id));
  S.prog = {}; (l.data || []).forEach(r => (S.prog[r.course_id] ??= new Set()).add(r.lesson_id));
  S.certs = c.data || [];
  S.lids = {}; (ls.data || []).forEach(r => (S.lids[r.course_id] ??= new Set()).add(r.id));
}

function renderAuthSlot() {
  const el = $('#auth-slot'); if (!el) return;
  if (!S.user) { el.innerHTML = `<a href="/login" class="btn bo">Log in</a><a href="/signup" class="btn bd hidden sm:inline-flex">Sign up</a>`; return; }
  const n = S.profile?.full_name || S.user.email || 'S';
  el.innerHTML = `<details class="relative"><summary class="cursor-pointer" aria-label="Account menu"><span class="w-9 h-9 rounded-full bg-p text-white font-bold flex items-center justify-center">${esc(n[0].toUpperCase())}</span></summary>
  <div class="absolute right-0 mt-2 w-56 card p-2 text-sm flex flex-col"><div class="px-3 py-2 border-b border-slate-100"><b class="block truncate">${esc(n)}</b><span class="text-xs text-ov block truncate">${esc(S.user.email)}</span></div>
  <a class="px-3 py-2 rounded hover:bg-c" href="/dashboard">My Dashboard</a><a class="px-3 py-2 rounded hover:bg-c" href="/profile">My Profile</a>
  <button type="button" onclick="logout()" class="text-left px-3 py-2 rounded hover:bg-c text-red-600 font-semibold">Logout</button></div></details>`;
}

/* ---- auth actions ---- */
async function doSignup(ev) {
  ev.preventDefault(); const f = ev.target, el = f.elements, b = f.querySelector('[type=submit]');
  const name = el.fullname.value.trim(), email = el.email.value.trim(), mobile = el.mobile.value.replace(/\D/g, ''), pw = el.pw.value;
  if (name.length < 2) return say('#msg', 'Please enter your full name.');
  if (!/^[6-9]\d{9}$/.test(mobile)) return say('#msg', 'Enter a valid 10-digit Indian mobile number.');
  if (pw.length < 8) return say('#msg', 'Password must be at least 8 characters.');
  if (pw !== el.pw2.value) return say('#msg', 'Passwords do not match.');
  busy(b, true);
  const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name, mobile }, emailRedirectTo: base() } });
  busy(b, false);
  if (error) return say('#msg', friendly(error));
  if (data.session) return say('#msg', 'Account created! Redirecting…', true);
  f.reset(); say('#msg', `Almost done! We sent a confirmation link to ${email}. Please verify your email, then log in.`, true);
}
async function doLogin(ev) {
  ev.preventDefault(); const f = ev.target, el = f.elements, b = f.querySelector('[type=submit]');
  busy(b, true);
  const { error } = await sb.auth.signInWithPassword({ email: el.email.value.trim(), password: el.pw.value });
  busy(b, false);
  if (error) say('#msg', friendly(error));
}
async function googleLogin() {
  sessionStorage.setItem('gci_oauth', '1');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: base() } });
  if (error) say('#msg', friendly(error));
}
async function doForgot(ev) {
  ev.preventDefault(); const f = ev.target, b = f.querySelector('[type=submit]');
  busy(b, true);
  const { error } = await sb.auth.resetPasswordForEmail(f.elements.email.value.trim(), { redirectTo: base() });
  busy(b, false);
  if (error && /rate|many|security/i.test(error.message)) return say('#msg', friendly(error));
  say('#msg', 'If an account exists for this email, a password reset link has been sent.', true);
}
async function doReset(ev) {
  ev.preventDefault(); const f = ev.target, el = f.elements, b = f.querySelector('[type=submit]');
  if (el.pw.value.length < 8) return say('#msg', 'Password must be at least 8 characters.');
  if (el.pw.value !== el.pw2.value) return say('#msg', 'Passwords do not match.');
  busy(b, true);
  const { error } = await sb.auth.updateUser({ password: el.pw.value });
  busy(b, false);
  if (error) return say('#msg', friendly(error));
  toast('Password updated successfully.'); go('#/dashboard');
}
async function sendResetLink() {
  const { error } = await sb.auth.resetPasswordForEmail(S.user.email, { redirectTo: base() });
  toast(error ? friendly(error) : 'Password reset link sent to your email.', error ? 'err' : '');
}
async function logout() { await sb.auth.signOut(); toast('Logged out.'); go('#/home'); }

async function saveProfile(ev) {
  ev.preventDefault(); const f = ev.target, el = f.elements, b = f.querySelector('[type=submit]');
  const full_name = el.fullname.value.trim(), mobile = el.mobile.value.replace(/\D/g, ''), state = el.state.value;
  if (full_name.length < 2) return say('#msg', 'Please enter your full name (it prints on your certificate).');
  if (!/^[6-9]\d{9}$/.test(mobile)) return say('#msg', 'Enter a valid 10-digit Indian mobile number.');
  busy(b, true);
  const { error } = await sb.from('profiles').update({ full_name, mobile, state }).eq('id', S.user.id);
  busy(b, false);
  if (error) return say('#msg', friendly(error));
  S.profile = { ...(S.profile || {}), full_name, mobile, state }; renderAuthSlot();
  if (f.dataset.complete) { const n = sessionStorage.getItem('gci_next'); sessionStorage.removeItem('gci_next'); toast('Profile saved. Welcome!'); go(n && n !== '#/complete' ? n : '#/dashboard'); return route(); }
  say('#msg', 'Profile saved.', true);
}

/* ---- learning actions ---- */
async function enrollFree(id) {
  if (!BACKEND) return toast('Backend is not configured yet.', 'err');
  if (!S.user) { sessionStorage.setItem('gci_next', '#/course/' + id); toast('Please log in or sign up to enroll.'); go('#/login'); return; }
  if (profileIncomplete()) { sessionStorage.setItem('gci_next', '#/course/' + id); toast('Please add your mobile number first.'); go('#/complete'); return; }
  if (S.enr.has(id)) { go('#/learn/' + id); return; }
  const { error } = await sb.rpc('enroll_free', { p_course: id });
  if (error) return toast(friendly(error), 'err');
  S.enr.add(id); toast('Enrolled successfully!'); go('#/learn/' + id);
}
async function toggleLesson(cid, lid, nextId) {
  const done = S.prog[cid]?.has(lid);
  const { error } = done
    ? await sb.from('lesson_progress').delete().match({ user_id: S.user.id, course_id: cid, lesson_id: lid })
    : await sb.from('lesson_progress').upsert({ user_id: S.user.id, course_id: cid, lesson_id: lid }, { onConflict: 'user_id,course_id,lesson_id', ignoreDuplicates: true });
  if (error) return toast(friendly(error), 'err');
  (S.prog[cid] ??= new Set())[done ? 'delete' : 'add'](lid);
  if (!done && nextId) go(`#/learn/${cid}/${nextId}`); else route();
}
async function claimCert(id) {
  const { data, error } = await sb.rpc('issue_certificate', { p_course: id });
  if (error) return toast(friendly(error), 'err');
  const c = Array.isArray(data) ? data[0] : data;
  S.certs = [c, ...S.certs.filter(x => x.id !== c.id)]; toast('Certificate issued! 🎉'); go('#/certificate/' + c.id);
}
async function verifyCert(id, sel) {
  id = (id || '').trim(); if (!id) return say(sel, 'Please enter a roll number.');
  if (!BACKEND) return say(sel, 'Verification service is not configured yet.');
  say(sel, 'Checking…', true);
  const { data, error } = await sb.rpc('verify_certificate', { p_roll: id });
  if (error) return say(sel, friendly(error));
  if (!data || !data.length) return say(sel, '✖ No certificate found for this roll number.');
  const r = data[0]; say(sel, `✔ Valid certificate: ${r.student_name} completed “${r.course_title}” on ${new Date(r.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`, true);
}

/* ---- session lifecycle ---- */
function onAuth(event, session) {
  S.user = session?.user || null;
  setTimeout(async () => { // never await supabase calls inside the callback itself
    if (BACKEND) await loadUser();
    S.ready = true; renderAuthSlot();
    if (/[?&](code|error)/.test(location.search)) history.replaceState(null, '', location.pathname);
    const r = pathOf().split('/').filter(Boolean)[0] || '';
    if (event === 'PASSWORD_RECOVERY') { go('#/reset'); return route(); }
    const cameBack = r === '' && sessionStorage.getItem('gci_oauth');
    if (event === 'SIGNED_IN' && S.user && (['login', 'signup', 'forgot'].includes(r) || cameBack)) {
      const n = sessionStorage.getItem('gci_next'); sessionStorage.removeItem('gci_next'); sessionStorage.removeItem('gci_oauth');
      go(n || '#/dashboard'); return route();
    }
    route();
  }, 0);
}
async function boot() {
  if (!BACKEND) { S.ready = true; renderAuthSlot(); return route(); }
  loadThumbs();
  const err = new URLSearchParams(location.search).get('error_description');
  if (err) setTimeout(() => toast(err, 'err'), 500);
  let first = false;
  sb.auth.onAuthStateChange((ev, s) => { first = true; onAuth(ev, s); });
  const { data } = await sb.auth.getSession();
  if (!first) onAuth('INITIAL_SESSION', data.session);
}

/* course thumbnails come from courses.thumbnail_url (editable in Supabase Table Editor) */
async function loadThumbs() {
  const { data } = await sb.from('courses').select('id,thumbnail_url');
  let ch = false;
  (data || []).forEach(r => { const c = C.find(x => x.id === r.id); if (c && r.thumbnail_url && c.thumb !== r.thumbnail_url) { c.thumb = r.thumbnail_url; ch = true; } });
  if (ch && S.ready) route(1);
}
