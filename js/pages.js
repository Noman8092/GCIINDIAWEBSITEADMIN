/* Public pages: About us, Live classes, Notes & PDFs. Loaded before account.js. */
const WA_NUM = ((window.GCI_ABOUT && window.GCI_ABOUT.whatsapp) || '918092388155');
const heroBand = (h1, sub, extra = '') => `<section class="bg-gradient-to-r from-[#1e3a8a] to-p text-white"><div class="${sec} py-12"><h1 class="text-3xl md:text-4xl font-extrabold max-w-3xl">${h1}</h1><p class="mt-3 max-w-2xl text-blue-100">${sub}</p>${extra}</div></section>`;

/* ---------------- ABOUT ---------------- */
function aboutV() {
  const a = window.GCI_ABOUT || {};
  const vals = (a.values || []).map((v, i) => `<div data-reveal style="--d:${i * .1}s" class="card p-5"><div class="w-12 h-12 rounded-full bg-c text-p flex items-center justify-center"><span class="ms" style="font-size:26px">${esc(v[0])}</span></div><h3 class="font-bold mt-3">${esc(v[1])}</h3><p class="text-sm text-ov mt-1">${esc(v[2])}</p></div>`).join('');
  const steps = (a.steps || []).map((s, i) => `<li data-reveal style="--d:${i * .08}s" class="flex gap-4"><span class="w-9 h-9 shrink-0 rounded-full bg-[#1c1d1f] text-white font-bold flex items-center justify-center">${i + 1}</span><div><b>${esc(s[0])}</b><p class="text-sm text-ov">${esc(s[1])}</p></div></li>`).join('');
  const team = (a.team || []).filter(t => t.name).map(t => `<div class="card p-5 text-center"><div class="w-20 h-20 mx-auto rounded-full bg-[#1c1d1f] text-white text-3xl font-bold flex items-center justify-center">${esc(t.name[0])}</div><b class="block mt-3">${esc(t.name)}</b><span class="text-sm text-ov">${esc(t.role || '')}</span><p class="text-sm mt-2">${esc(t.bio || '')}</p></div>`).join('');
  return heroBand('About GCI India', esc(a.tagline || ''), '<div class="flex flex-wrap gap-3 mt-6"><a href="/courses/" class="btn bd">Explore courses</a><a href="/free-courses/" class="btn bg-white text-black">Start free</a></div>') +
  `<section class="${sec} py-10 grid lg:grid-cols-2 gap-8 items-center"><div data-reveal="left"><h2 class="text-2xl font-extrabold">Who we are</h2>${(a.intro || []).map(p => `<p class="mt-3 leading-relaxed">${esc(p)}</p>`).join('')}</div>
   <div data-reveal="right" class="rounded-2xl bg-gradient-to-br from-p to-tc text-white p-8"><span class="ms" style="font-size:40px">flag</span><h2 class="text-xl font-extrabold mt-2">Our mission</h2><p class="mt-2 text-blue-50 leading-relaxed">${esc(a.mission || '')}</p></div></section>
   <section class="bg-cl py-10"><div class="${sec}"><h2 class="text-2xl font-extrabold text-center mb-6" data-reveal>What makes us different</h2><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">${vals}</div></div></section>
   <section class="${sec} py-10"><h2 class="text-2xl font-extrabold mb-6" data-reveal>How learning works</h2><ol class="grid md:grid-cols-2 gap-6 max-w-4xl">${steps}</ol></section>
   ${team ? `<section class="bg-cl py-10"><div class="${sec}"><h2 class="text-2xl font-extrabold text-center mb-6">Our team</h2><div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">${team}</div></div></section>` : ''}
   <section class="${sec} py-10"><div class="card p-6 grid md:grid-cols-2 gap-6 items-center" data-reveal="zoom"><div><h2 class="text-xl font-extrabold">Talk to us</h2><p class="text-sm text-ov mt-2">${esc(a.hours || '')}</p>${a.email ? `<p class="mt-2 text-sm"><span class="ms text-base">mail</span> <a class="text-p underline" href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>` : ''}${a.address ? `<p class="mt-2 text-sm"><span class="ms text-base">location_on</span> ${esc(a.address)}</p>` : ''}</div>
   <div class="flex flex-wrap gap-3 md:justify-end"><a href="https://wa.me/${WA_NUM}" target="_blank" rel="noopener" class="btn bp">Chat on WhatsApp</a><a href="/contact-us/" class="btn bo">Contact page</a></div></div></section>`;
}

/* ---------------- LIVE CLASSES ---------------- */
const LV = { list: null, regs: new Set(), busy: false };
const endOf = c => +new Date(c.starts_at) + c.duration_min * 60000;
const istFmt = iso => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
const gcal = c => { const f = t => new Date(t).toISOString().replace(/[-:]|\.\d{3}/g, ''); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(c.title)}&dates=${f(c.starts_at)}/${f(endOf(c))}&details=${encodeURIComponent('GCI India live class. Join from https://gciindia.com/live-classes/')}`; };
async function liveLoad() {
  LV.busy = true;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [c, r] = await Promise.all([sb.from('live_classes').select('*').gte('starts_at', since).order('starts_at'), S.user ? sb.from('live_registrations').select('class_id') : Promise.resolve({ data: [] })]);
  if (c.error) toast(friendly(c.error), 'err');
  LV.list = c.data || []; LV.regs = new Set((r.data || []).map(x => x.class_id)); LV.busy = false; route(1);
}
function liveBtn(c) {
  const st = +new Date(c.starts_at), now = Date.now(), reg = LV.regs.has(c.id);
  if (endOf(c) < now) return reg ? `<button onclick="liveJoin(${c.id})" class="btn bs">▶ Watch recording</button>` : '<span class="text-sm text-ov">This class has ended</span>';
  if (!S.user) return `<button onclick="liveRegister(${c.id})" class="btn bd">Log in to register</button>`;
  if (!reg) return `<button onclick="liveRegister(${c.id})" class="btn bd">Register free</button>`;
  return `<div class="flex flex-wrap gap-2 items-center"><span class="text-sm font-bold text-t">✔ Registered</span>${now >= st - 15 * 60000 ? `<button onclick="liveJoin(${c.id})" class="btn bp">Join now</button>` : '<span class="text-xs text-ov">The Join button opens 15 minutes before the class</span>'}<a class="btn bs" target="_blank" rel="noopener" href="${gcal(c)}">Add to calendar</a><button onclick="liveCancel(${c.id})" class="text-xs text-ov underline">Cancel</button></div>`;
}
function liveCard(c) {
  const course = C.find(x => x.id === c.course_id), live = Date.now() >= +new Date(c.starts_at) && Date.now() <= endOf(c);
  return `<div class="card p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between"><div class="flex gap-4"><div class="w-14 h-14 rounded-xl bg-gradient-to-br from-pc to-tc text-white flex items-center justify-center shrink-0"><span class="ms" style="font-size:30px">live_tv</span></div>
  <div class="min-w-0"><div class="text-xs font-bold text-t uppercase">${live ? '<span class="text-red-600">● LIVE NOW</span>' : esc(istFmt(c.starts_at))} · ${c.duration_min} min · ${esc(c.platform)}</div><h3 class="font-bold text-lg leading-snug">${esc(c.title)}</h3>
  ${c.description ? `<p class="text-sm text-ov mt-1">${esc(c.description)}</p>` : ''}<p class="text-xs text-ov mt-1">${c.host ? 'Mentor: ' + esc(c.host) : ''}${course ? (c.host ? ' · ' : '') + 'Course: <a class="text-p underline" href="/course/' + course.slug + '/">' + esc(course.t) + '</a>' : ''}</p></div></div><div class="shrink-0">${liveBtn(c)}</div></div>`;
}
function liveV() {
  const intro = heroBand('Free Live Classes', 'Join our mentors for doubt-clearing and revision sessions, ask your questions live and learn with other students.');
  if (!BACKEND) return intro + `<section class="${sec} py-10"><p class="text-ov">Live class schedule will appear here soon.</p></section>`;
  if (!LV.list) { if (!LV.busy) liveLoad(); return intro + spinner(); }
  const now = Date.now(), up = LV.list.filter(c => endOf(c) >= now), past = LV.list.filter(c => endOf(c) < now).reverse();
  return intro + `<section class="${sec} py-8 max-w-4xl"><h2 class="text-xl font-extrabold mb-4">Upcoming classes</h2><div class="flex flex-col gap-4">${up.map(liveCard).join('') || `<div class="card p-8 text-center text-ov">No class is scheduled right now. Message us on WhatsApp to get the next schedule.<br><a href="https://wa.me/${WA_NUM}" target="_blank" rel="noopener" class="btn bp mt-4">Chat on WhatsApp</a></div>`}</div>
  ${past.length ? `<h2 class="text-xl font-extrabold mt-10 mb-4">Recent classes</h2><div class="flex flex-col gap-4">${past.map(liveCard).join('')}</div>` : ''}
  <p class="text-xs text-ov mt-8">All times are in Indian Standard Time (IST). You need a free account to register. The meeting link is shown to registered students 15 minutes before the class starts.</p></section>`;
}
async function liveRegister(id) {
  if (!S.user) { sessionStorage.setItem('gci_next', '#/live-classes'); toast('Please log in or sign up to register.'); return go('/login'); }
  if (profileIncomplete()) { sessionStorage.setItem('gci_next', '#/live-classes'); toast('Please add your mobile number first.'); return go('/complete'); }
  const { error } = await sb.from('live_registrations').insert({ class_id: id });
  if (error && error.code !== '23505') return toast(friendly(error), 'err');
  LV.regs.add(id); toast('Registered ✔ We will see you in class!'); route(1);
}
async function liveCancel(id) {
  if (!confirm('Cancel your registration for this class?')) return;
  const { error } = await sb.from('live_registrations').delete().eq('class_id', id).eq('user_id', S.user.id);
  if (error) return toast(friendly(error), 'err');
  LV.regs.delete(id); route(1);
}
async function liveJoin(id) {
  const w = window.open('', '_blank');
  const { data, error } = await sb.rpc('live_access', { p_class: id });
  const r = (Array.isArray(data) ? data[0] : data) || {}, close = m => { if (w) w.close(); toast(m, 'err'); };
  if (error) return close(friendly(error));
  if (r.o_status === 'live') { if (!r.o_join) return close('The class link has not been added yet. Please check again in a minute.'); if (w) { w.opener = null; w.location.href = r.o_join; } return; }
  if (r.o_status === 'ended') { if (!r.o_rec) return close('The recording is not available yet.'); if (w) { w.opener = null; w.location.href = r.o_rec; } return; }
  if (r.o_status === 'early') return close('The class link opens 15 minutes before the start time.');
  if (r.o_status === 'register') return close('Please register for this class first.');
  close('Please log in to join.');
}

/* ---------------- NOTES & PDFs ---------------- */
const NT = { free: null, mine: null, busy: false };
const fmtSize = b => !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
async function ntLoad() {
  NT.busy = true;
  const [f, m] = await Promise.all([sb.from('notes').select('*').eq('is_free', true).order('sort_order').order('id'), S.user ? sb.from('notes').select('*').eq('is_free', false).order('sort_order').order('id') : Promise.resolve({ data: [] })]);
  NT.free = f.data || []; NT.mine = m.data || []; NT.busy = false;
  if (pathOf() === '/notes-and-pdfs') route(1); else document.querySelectorAll('#notes-slot').forEach(s => s.innerHTML = notesInner(+s.dataset.c));
}
const noteRow = n => `<div class="card p-4 flex gap-3 items-center"><span class="ms text-red-600" style="font-size:34px">picture_as_pdf</span><div class="flex-1 min-w-0"><b class="block leading-snug">${esc(n.title)}</b>${n.description ? `<p class="text-sm text-ov line-clamp-2">${esc(n.description)}</p>` : ''}<span class="text-xs text-ov">PDF${n.file_size ? ' · ' + fmtSize(n.file_size) : ''}</span></div><div class="flex gap-2 shrink-0"><button onclick="openNote(${n.id})" class="btn bd">Read</button><button onclick="openNote(${n.id},true)" class="btn bs" aria-label="Download">⬇</button></div></div>`;
function notesInner(cid) {
  const l = (NT.mine || []).filter(n => n.course_id === cid);
  return l.length ? `<div class="mt-6"><b class="text-sm">Notes & PDFs for this course</b><div class="flex flex-col gap-2 mt-2">${l.map(n => `<button onclick="openNote(${n.id})" class="flex gap-2 items-center text-left text-sm p-2 rounded-lg hover:bg-c"><span class="ms text-red-600">picture_as_pdf</span><span class="flex-1">${esc(n.title)}</span><span class="text-xs text-ov">${fmtSize(n.file_size)}</span></button>`).join('')}</div></div>` : '';
}
function notesBlock(cid) { if (BACKEND && NT.mine === null && !NT.busy) ntLoad(); return `<div id="notes-slot" data-c="${cid}">${notesInner(cid)}</div>`; }
function notesV() {
  const intro = heroBand('Notes & PDFs', 'Free study material for everyone, and course notes for enrolled students. Read online or download.');
  if (!BACKEND) return intro + `<section class="${sec} py-10 text-ov">Notes will appear here soon.</section>`;
  if (NT.free === null) { if (!NT.busy) ntLoad(); return intro + spinner(); }
  const groups = {}; (NT.mine || []).forEach(n => (groups[n.course_id] ??= []).push(n));
  const mine = Object.keys(groups).map(cid => { const c = C.find(x => x.id == cid); return `<div class="mt-6"><h3 class="font-bold mb-2">${c ? `<a class="hover:text-p" href="/course/${c.slug}/">${esc(c.t)}</a>` : 'Course notes'}</h3><div class="grid md:grid-cols-2 gap-3">${groups[cid].map(noteRow).join('')}</div></div>`; }).join('');
  return intro + `<section class="${sec} py-8 max-w-5xl"><h2 class="text-xl font-extrabold">Free notes for everyone</h2><div class="grid md:grid-cols-2 gap-3 mt-4">${(NT.free || []).map(noteRow).join('') || '<p class="text-ov">Free notes will be added soon.</p>'}</div>
  <h2 class="text-xl font-extrabold mt-10">Your course notes</h2>${S.user ? (mine || '<p class="text-ov mt-3">Notes for the courses you enroll in will appear here. <a class="text-p underline" href="/courses/">Browse courses</a></p>') : '<div class="card p-6 mt-3 text-center"><p class="text-ov">Log in to see the notes of your courses.</p><a href="/login" class="btn bd mt-3">Log in</a></div>'}</section>`;
}
async function openNote(id, dl) {
  const n = [...(NT.free || []), ...(NT.mine || [])].find(x => x.id === id); if (!n) return;
  const w = dl ? null : window.open('', '_blank'); let url;
  if (n.is_free) url = sb.storage.from('free-notes').getPublicUrl(n.file_path, dl ? { download: n.file_name || true } : undefined).data.publicUrl;
  else {
    const { data, error } = await sb.storage.from('course-notes').createSignedUrl(n.file_path, 600, dl ? { download: n.file_name || true } : undefined);
    if (error || !data) { if (w) w.close(); return toast('Could not open this file. Please log in again.', 'err'); }
    url = data.signedUrl;
  }
  if (dl) { const a = document.createElement('a'); a.href = url; a.download = n.file_name || ''; document.body.appendChild(a); a.click(); a.remove(); } else if (w) { w.opener = null; w.location.href = url; } else window.location.href = url;
}
