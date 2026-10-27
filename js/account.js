/* Account views: auth forms, dashboard, profile, course player, certificate, verify */
const IN = 'w-full bg-cl px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-pc text-sm';
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi NCR','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry','Other'];
const ACC = ['admin', 'login', 'signup', 'forgot', 'reset', 'complete', 'dashboard', 'profile', 'learn', 'certificate', 'verify-certificate'];
const profileIncomplete = () => !/^[6-9]\d{9}$/.test(S.profile?.mobile || '');
const pct = id => { const t = S.lids[id]; if (!t || !t.size) return 0; let n = 0; (S.prog[id] || new Set()).forEach(x => { if (t.has(x)) n++; }); return Math.round(n / t.size * 100); };
function videoEmbed(u) {
  u = (u || '').trim(); if (!u) return null; let m;
  if ((m = u.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)) || (m = u.match(/^([\w-]{11})$/)))
    return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`;
  if ((m = u.match(/^(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-f0-9]+)|\?(?:.*&)?h=([a-f0-9]+))?/i))) {
    const h = m[2] || m[3]; return `https://player.vimeo.com/video/${m[1]}?${h ? 'h=' + h + '&' : ''}dnt=1`;
  }
  return null;
}
async function loadLessons(id) {
  const { data, error } = await sb.from('lessons').select('id,lesson_no,title,video_url,duration').eq('course_id', id).order('lesson_no').order('id');
  if (error) toast(friendly(error), 'err');
  S.lessons[id] = data || []; route();
}
async function loadOutline(id) {
  const box = $('#outline-body'); if (!box || !BACKEND) return;
  const { data, error } = await sb.rpc('course_outline', { p_course: id });
  if (error || !box.isConnected) return;
  if (!data.length) { box.innerHTML = '<p class="text-sm text-ov">Detailed curriculum will be published soon.</p>'; return; }
  $('#outline-count').textContent = `· ${data.length} lessons`;
  box.innerHTML = data.map(l => `<div class="flex justify-between gap-3 p-3 bg-cl rounded-lg text-sm"><span><b class="text-p mr-2">${l.lesson_no}.</b>${esc(l.title)}</span><span class="text-xs text-ov shrink-0">${esc(l.duration || '')}</span></div>`).join('');
}
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const spinner = () => `<div class="py-32 text-center text-ov"><span class="ms animate-spin" style="font-size:40px">progress_activity</span><p class="text-sm mt-2">Loading…</p></div>`;
const shell = inner => `<section class="max-w-md mx-auto px-4 py-12"><div class="card p-7">${inner}</div></section>`;
const msgBox = `<div id="msg" role="alert" aria-live="polite" hidden></div>`;
const field = (label, name, type, extra = '', val = '') => `<label class="text-sm font-semibold block">${label}<input name="${name}" type="${type}" ${extra} value="${esc(val)}" class="${IN} mt-1 font-normal" required></label>`;
const msgV = (title, text, href, label) => `<section class="max-w-lg mx-auto px-4 py-20 text-center"><div class="card p-8"><h1 class="text-2xl font-bold">${title}</h1><p class="text-ov mt-2">${text}</p><a href="${toPath(href)}" class="btn bp mt-5">${label}</a></div></section>`;

function accountView(a, b, x) {
  if (!S.ready) return spinner();
  if (!BACKEND) return msgV('Backend not configured', 'Add your Supabase URL and anon key in <code>js/config.js</code> (see README) to enable accounts.', '#/home', 'Back to Home');
  if (['admin', 'dashboard', 'profile', 'learn', 'certificate'].includes(a) && !S.user) {
    sessionStorage.setItem('gci_next', curHash()); setTimeout(() => go('#/login'), 0); return spinner();
  }
  if (['login', 'signup', 'forgot'].includes(a) && S.user) { setTimeout(() => go('#/dashboard'), 0); return spinner(); }
  if (a === 'complete' && !S.user) { setTimeout(() => go('#/login'), 0); return spinner(); }
  if (a === 'complete' && !profileIncomplete()) { setTimeout(() => go(sessionStorage.getItem('gci_next') || '#/dashboard'), 0); sessionStorage.removeItem('gci_next'); return spinner(); }
  if (['dashboard', 'learn', 'certificate'].includes(a) && profileIncomplete()) {
    if (!sessionStorage.getItem('gci_next')) sessionStorage.setItem('gci_next', curHash());
    setTimeout(() => go('#/complete'), 0); return spinner();
  }
  if (a === 'admin') {
    if (!window.adminView) { if (!accountView.loading) { accountView.loading = 1; const s = document.createElement('script'); s.src = '/js/admin.js'; s.onload = () => route(1); document.head.appendChild(s); } return spinner(); }
    return adminView(b, x);
  }
  return ({ login: authV, signup: authV, forgot: authV, reset: resetV, complete: completeV, dashboard: dashV, profile: profileV, learn: learnV, certificate: certV, 'verify-certificate': verifyV })[a](a, b, x);
}

function authV(kind) {
  const google = `<button type="button" onclick="googleLogin()" class="btn w-full bg-white border border-slate-300 hover:bg-slate-50 mt-5"><b class="text-[#4285F4] text-base">G</b> Continue with Google</button><div class="flex items-center gap-3 my-4 text-xs text-ov"><span class="flex-1 h-px bg-slate-200"></span>or<span class="flex-1 h-px bg-slate-200"></span></div>`;
  if (kind === 'login') return shell(`<h1 class="text-2xl font-extrabold">Welcome back</h1><p class="text-sm text-ov mt-1">Log in to continue learning.</p>${google}
    <form onsubmit="doLogin(event)" class="flex flex-col gap-3">${field('Email', 'email', 'email', 'autocomplete="email"')}${field('Password', 'pw', 'password', 'autocomplete="current-password"')}${msgBox}<button type="submit" class="btn bp py-3">Log in</button></form>
    <div class="flex justify-between text-sm mt-4"><a class="text-p font-semibold" href="/forgot">Forgot password?</a><a class="text-p font-semibold" href="/signup">Create account</a></div>`);
  if (kind === 'signup') return shell(`<h1 class="text-2xl font-extrabold">Create your free account</h1><p class="text-sm text-ov mt-1">Your name will be printed on your certificate.</p>${google}
    <form onsubmit="doSignup(event)" class="flex flex-col gap-3">${field('Full name', 'fullname', 'text', 'autocomplete="name" maxlength="100"')}${field('Email', 'email', 'email', 'autocomplete="email"')}${field('Mobile number', 'mobile', 'tel', 'autocomplete="tel" inputmode="numeric" maxlength="14" placeholder="10-digit number"')}
    ${field('Password (min 8 characters)', 'pw', 'password', 'autocomplete="new-password" minlength="8"')}${field('Confirm password', 'pw2', 'password', 'autocomplete="new-password"')}${msgBox}<button type="submit" class="btn bp py-3">Sign up</button></form>
    <p class="text-sm mt-4 text-center">Already have an account? <a class="text-p font-semibold" href="/login">Log in</a></p>`);
  return shell(`<h1 class="text-2xl font-extrabold">Reset your password</h1><p class="text-sm text-ov mt-1 mb-4">Enter your email and we’ll send a reset link.</p><form onsubmit="doForgot(event)" class="flex flex-col gap-3">${field('Email', 'email', 'email', 'autocomplete="email"')}${msgBox}<button type="submit" class="btn bp py-3">Send reset link</button></form><a class="text-p font-semibold text-sm block mt-4 text-center" href="/login">← Back to login</a>`);
}
function resetV() {
  if (!S.user) return msgV('Link expired', 'This password reset link is invalid or has expired.', '#/forgot', 'Request a new link');
  return shell(`<h1 class="text-2xl font-extrabold mb-4">Set a new password</h1><form onsubmit="doReset(event)" class="flex flex-col gap-3">${field('New password', 'pw', 'password', 'autocomplete="new-password" minlength="8"')}${field('Confirm password', 'pw2', 'password', 'autocomplete="new-password"')}${msgBox}<button type="submit" class="btn bp py-3">Update password</button></form>`);
}

function completeV() {
  const p = S.profile || {};
  return shell(`<h1 class="text-2xl font-extrabold">Complete your profile</h1><p class="text-sm text-ov mt-1 mb-4">Just one more step. Please add your mobile number so our team can contact you about your courses and certificates.</p>
  <form data-complete="1" onsubmit="saveProfile(event)" class="flex flex-col gap-3">${field('Full name (printed on certificate)', 'fullname', 'text', 'maxlength="100" autocomplete="name"', p.full_name || '')}
  ${field('Mobile number', 'mobile', 'tel', 'inputmode="numeric" maxlength="14" autocomplete="tel" placeholder="10-digit number"', p.mobile || '')}
  <label class="text-sm font-semibold block">State<select name="state" class="${IN} mt-1 font-normal"><option value="">Select state</option>${STATES.map(s => `<option ${p.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
  ${msgBox}<button type="submit" class="btn bp py-3">Save & continue</button></form>
  <p class="text-xs text-ov mt-4 text-center">Your number is used only to contact you about your learning. <button onclick="logout()" class="text-p font-semibold">Logout</button></p>`);
}

function courseRow(id) {
  const c = C.find(x => x.id === id), p = pct(id), cert = S.certs.find(k => k.course_id === id), nl = S.lids[id]?.size || 0;
  const act = cert ? `<a href="/certificate/${cert.id}" class="btn bs w-full mt-3">🏅 View certificate</a>` : p === 100 ? `<button onclick="claimCert(${id})" class="btn bp w-full mt-3">Get certificate</button>` : `<a href="/learn/${id}" class="btn bd w-full mt-3">${p ? 'Continue learning' : 'Start course'}</a>`;
  return `<div class="cc">${thumb(c, 'rounded-lg border border-slate-200')}<h3 class="font-bold leading-snug mt-2 line-clamp-2">${c.t}</h3><p class="text-xs text-ov mt-1">${nl ? nl + ' lessons' : 'Lessons coming soon'}</p><div class="h-1.5 bg-ch rounded-full overflow-hidden mt-2"><div class="h-full bg-t" style="width:${p}%"></div></div><p class="text-xs font-bold mt-1">${p}% complete</p>${act}</div>`;
}
function dashV() {
  const first = esc((S.profile?.full_name || S.user.email).split(' ')[0]), ids = [...S.enr], lessons = Object.values(S.prog).reduce((n, s) => n + s.size, 0);
  const stat = (i, n, l) => `<div class="card p-4 flex items-center gap-3"><span class="ms text-p text-3xl">${i}</span><div><b class="text-2xl block leading-none">${n}</b><span class="text-xs text-ov">${l}</span></div></div>`;
  const free = C.filter(c => !c.p && !S.enr.has(c.id));
  return `<section class="bg-[#1c1d1f] text-white py-10"><div class="${sec}"><h1 class="text-3xl font-extrabold">My learning</h1><p class="text-slate-300 mt-1">Welcome back, ${first} 👋</p></div></section>
  <section class="${sec} py-8 flex flex-col gap-8"><div class="grid sm:grid-cols-3 gap-4">${stat('menu_book', ids.length, 'Courses enrolled')}${stat('task_alt', lessons, 'Lessons completed')}${stat('workspace_premium', S.certs.length, 'Certificates earned')}</div>
  <div><h2 class="text-2xl font-bold mb-4">My Courses</h2>${ids.length ? `<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">${ids.map(courseRow).join('')}</div>` : `<div class="card p-8 text-center text-ov">You haven’t enrolled in any course yet.<br><a href="/courses/" class="btn bp mt-4">Browse courses</a></div>`}
  <p class="text-xs text-ov mt-3">Bought a paid course? Access is activated by our team after payment confirmation. <a class="text-p font-semibold" target="_blank" href="https://wa.me/918092388155">Message us on WhatsApp</a> if it doesn’t show up.</p></div>
  ${free.length ? `<div><h2 class="text-2xl font-bold mb-4">Start learning free</h2><div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">${free.map(cardH).join('')}</div></div>` : ''}
  ${S.certs.length ? `<div><h2 class="text-2xl font-bold mb-4">My Certificates</h2><div class="grid sm:grid-cols-2 gap-3">${S.certs.map(k => `<a href="/certificate/${k.id}" class="card p-4 hover:shadow-lg flex gap-3 items-center"><span class="ms text-amber-500 text-4xl">workspace_premium</span><div><b class="block">${esc(C.find(c => c.id === k.course_id)?.t || 'Course')}</b><span class="text-xs text-ov">${esc(k.roll_no)} · ${fmtDate(k.issued_at)}</span></div></a>`).join('')}</div></div>` : ''}</section>`;
}

function profileV() {
  const p = S.profile || {};
  return `<section class="max-w-xl mx-auto px-4 py-10"><h1 class="text-3xl font-extrabold mb-5">My Profile</h1><div class="card p-6"><form onsubmit="saveProfile(event)" class="flex flex-col gap-4">
  ${field('Full name (printed on certificate)', 'fullname', 'text', 'maxlength="100"', p.full_name || '')}
  <label class="text-sm font-semibold block">Email<input value="${esc(S.user.email)}" disabled class="${IN} mt-1 font-normal opacity-60"></label>
  ${field('Mobile number', 'mobile', 'tel', 'inputmode="numeric" maxlength="14"', p.mobile || '')}
  <label class="text-sm font-semibold block">State<select name="state" class="${IN} mt-1 font-normal"><option value="">Select state</option>${STATES.map(s => `<option ${p.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
  ${msgBox}<button type="submit" class="btn bp py-3">Save changes</button></form></div>
  <div class="card p-6 mt-5 flex items-center justify-between gap-3 flex-wrap"><div><b>Password</b><p class="text-xs text-ov">We’ll email you a secure link to change it.</p></div><button onclick="sendResetLink()" class="btn bs">Send reset link</button></div></section>`;
}

function learnV(a, idStr, lidStr) {
  const id = +idStr, c = C.find(x => x.id === id);
  if (!c) return msgV('Course not found', 'This course does not exist.', '#/courses', 'Browse courses');
  if (!S.enr.has(id)) return msgV('You are not enrolled yet', c.p ? 'This is a paid course. After your payment is confirmed, our team will unlock it for you.' : 'Enroll for free to start learning.', '/course/' + c.slug + '/', 'View course');
  if (!S.lessons[id]) { if (!S.ll[id]) { S.ll[id] = 1; loadLessons(id); } return spinner(); }
  const L = S.lessons[id];
  if (!L.length) return msgV('Lessons coming soon', 'Our team is uploading the lessons for this course. Please check back shortly.', '#/dashboard', 'Back to Dashboard');
  const done = S.prog[id] || new Set(), cur = L.find(l => l.id === +lidStr) || L.find(l => !done.has(l.id)) || L[0];
  const i = L.indexOf(cur), isDone = done.has(cur.id), all = L.every(l => done.has(l.id)), cert = S.certs.find(k => k.course_id === id), nxt = L[i + 1], emb = videoEmbed(cur.video_url);
  const video = emb ? `<iframe class="w-full aspect-video rounded-xl bg-black" src="${emb}" title="${esc(cur.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    : `<div class="w-full aspect-video rounded-xl bg-gradient-to-br from-p to-tc text-white flex flex-col items-center justify-center"><span class="ms" style="font-size:64px">play_circle</span><p class="mt-2 text-sm opacity-90">Video for this lesson will be available soon</p></div>`;
  return `<div class="bg-[#1c1d1f] text-white"><div class="${sec} py-4 flex items-center justify-between gap-4"><div class="min-w-0"><a href="/dashboard" class="text-xs text-violet-300 font-bold">← My learning</a><h1 class="text-lg font-bold truncate">${c.t}</h1></div><span class="text-sm font-bold shrink-0">${pct(id)}% complete</span></div></div><section class="${sec} py-6">
  <div class="grid lg:grid-cols-12 gap-6 mt-5 items-start"><div class="lg:col-span-8 flex flex-col gap-4">${video}
  <div class="card p-5"><span class="text-xs font-bold text-t uppercase">Lesson ${i + 1} of ${L.length}${cur.duration ? ' · ' + esc(cur.duration) : ''}</span><h2 class="text-xl font-bold mt-1">${esc(cur.title)}</h2><p class="text-sm text-ov mt-2">Watch the lecture, practise along, then mark the lesson complete to track your progress.</p>
  <div class="flex flex-wrap gap-3 mt-4"><button onclick="toggleLesson(${id},${cur.id},${nxt ? nxt.id : 0})" class="btn ${isDone ? 'bs' : 'bp'}">${isDone ? '✔ Completed (click to undo)' : 'Mark as complete'}</button>
  ${i > 0 ? `<a href="/learn/${id}/${L[i - 1].id}" class="btn bs">← Previous</a>` : ''}${nxt ? `<a href="/learn/${id}/${nxt.id}" class="btn bs">Next →</a>` : ''}</div></div>
  ${all ? `<div class="card p-5 bg-teal-50 flex flex-wrap gap-3 items-center justify-between"><div><b class="text-t">🎉 Course completed!</b><p class="text-sm text-ov">${cert ? 'Your certificate is ready.' : 'Claim your verified certificate.'}</p></div>${cert ? `<a href="/certificate/${cert.id}" class="btn bp">View certificate</a>` : `<button onclick="claimCert(${id})" class="btn bp">Get my certificate</button>`}</div>` : ''}</div>
  <aside class="lg:col-span-4 card p-4"><div class="flex justify-between text-sm font-bold mb-2"><span>Course progress</span><span>${pct(id)}%</span></div><div class="h-2 bg-ch rounded-full overflow-hidden mb-4"><div class="h-full bg-t" style="width:${pct(id)}%"></div></div>
  <div class="flex flex-col gap-1 max-h-[65vh] overflow-y-auto">${L.map((l, k) => `<a href="/learn/${id}/${l.id}" class="flex gap-3 items-center p-3 rounded-lg text-sm ${l.id === cur.id ? 'on font-semibold' : 'hover:bg-c'}"><span class="ms ${done.has(l.id) ? 'text-t' : 'text-slate-300'}">${done.has(l.id) ? 'check_circle' : 'radio_button_unchecked'}</span><span class="flex-1">${k + 1}. ${esc(l.title)}</span>${l.duration ? `<span class="text-xs text-ov">${esc(l.duration)}</span>` : ''}</a>`).join('')}</div>${notesBlock(id)}</aside></div></section>`;
}

function certV(a, id) {
  const k = S.certs.find(x => x.id === id);
  if (!k) return msgV('Certificate not found', 'We couldn’t find this certificate in your account.', '#/dashboard', 'Go to Dashboard');
  const c = C.find(x => x.id === k.course_id);
  return `<section class="max-w-3xl mx-auto px-4 py-8"><div class="flex justify-between items-center mb-4 noprint"><a href="/dashboard" class="text-p text-sm font-semibold">← Dashboard</a><button onclick="window.print()" class="btn bp">🖨 Print / Save as PDF</button></div>
  <div class="bg-white p-3 shadow-xl" style="border:6px double #2457d6"><div class="p-8 md:p-12 text-center" style="border:2px solid #c9a227">
  <div class="font-extrabold text-p text-2xl tracking-wide">GCI INDIA</div><div class="text-xs tracking-[.3em] text-ov mt-1">GLOBAL COMPUTER INSTITUTE</div>
  <h1 class="text-3xl md:text-4xl font-extrabold mt-8" style="font-family:Georgia,serif">Certificate of Completion</h1><p class="mt-6 text-ov">This is to certify that</p>
  <p class="text-3xl md:text-4xl font-bold text-p mt-3 break-words" style="font-family:Georgia,serif">${esc(k.student_name)}</p><p class="mt-5 text-ov">has successfully completed the course</p><p class="text-xl md:text-2xl font-bold mt-2">${c ? c.t : ''}</p>
  <div class="flex flex-wrap justify-between gap-4 mt-10 text-sm text-left"><div><span class="text-ov text-xs block">Roll / Certificate No.</span><b>${esc(k.roll_no)}</b></div><div class="sm:text-right"><span class="text-ov text-xs block">Date of issue</span><b>${fmtDate(k.issued_at)}</b></div></div>
  <p class="text-xs text-ov mt-8">Verify this certificate at ${esc(base())}verify-certificate/</p></div></div></section>`;
}

function verifyV() {
  return `<section class="max-w-lg mx-auto px-4 py-14"><div class="card p-7"><h1 class="text-2xl font-extrabold">Verify a Certificate</h1><p class="text-sm text-ov mt-1 mb-4">Enter the roll / certificate number printed on the certificate.</p>
  <form onsubmit="event.preventDefault();verifyCert(this.elements.roll.value,'#vr2')" class="flex gap-2"><input name="roll" class="${IN}" placeholder="e.g. GCI-2026-01001" required><button class="btn bp">Verify</button></form><div id="vr2" role="status" hidden class="mt-4"></div></div></section>`;
}

boot();
