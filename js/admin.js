/* Admin panel (lazy-loaded from /admin). Only works for profiles.is_admin = true. Uses helpers from app.js / auth.js / account.js */
const A = { courses: null, counts: {}, lessons: {}, busy: false, live: null, liveBusy: false, links: {}, regCount: {}, regs: {}, notes: null, notesBusy: false };
const ADM_CATS = [['computer', 'Computer Courses'], ['web', 'Web Development'], ['marketing', 'Digital Marketing'], ['ecommerce', 'E-commerce']];
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const lbl = (t, inner, hint) => `<label class="block text-sm font-semibold">${t}${inner}${hint ? `<span class="block text-xs font-normal text-ov mt-1">${hint}</span>` : ''}</label>`;
const inp = (name, val, extra = '') => `<input name="${name}" value="${esc(val ?? '')}" ${extra} class="${IN} mt-1 font-normal">`;
const area = (name, val, rows = 3, extra = '') => `<textarea name="${name}" rows="${rows}" ${extra} class="${IN} mt-1 font-normal">${esc(val ?? '')}</textarea>`;

async function adminLoad() {
  A.busy = true;
  const [c, l] = await Promise.all([sb.from('courses').select('*').order('sort_order').order('id'), sb.from('lessons').select('course_id')]);
  if (c.error) toast(friendly(c.error), 'err');
  A.courses = c.data || []; A.counts = {}; (l.data || []).forEach(r => A.counts[r.course_id] = (A.counts[r.course_id] || 0) + 1);
  A.busy = false; route(1);
}
function adminView(b, x) {
  if (!S.profile?.is_admin) return msgV('No admin access', 'This area is only for GCI India administrators.', '/dashboard', 'Back to my learning');
  if (!A.courses) { if (!A.busy) adminLoad(); return spinner(); }
  if (b === 'course') return courseForm(x);
  if (b === 'lessons') return lessonsV(+x);
  if (b === 'live') return liveAdminList();
  if (b === 'liveform') return liveForm(x);
  if (b === 'livestudents') return liveStudents(+x);
  if (b === 'notes') return notesAdmin();
  return courseList();
}
const bar = (title, right = '') => { const p = pathOf(), tab = (h, t, on) => `<a href="${h}" class="px-3 py-1.5 rounded-full text-sm font-semibold ${on ? 'bg-white text-black' : 'text-slate-300 hover:text-white'}">${t}</a>`;
  return `<section class="bg-[#1c1d1f] text-white py-6"><div class="${sec}"><div class="flex flex-wrap items-center justify-between gap-3"><div><a href="/admin" class="text-xs text-violet-300 font-bold">Admin</a><h1 class="text-2xl font-extrabold">${title}</h1></div><div class="flex gap-2">${right}</div></div><nav class="flex gap-2 mt-4">${tab('/admin', 'Courses', !/live|notes/.test(p))}${tab('/admin/live', 'Live classes', /live/.test(p))}${tab('/admin/notes', 'Notes & PDFs', /notes/.test(p))}</nav></div></section>`; };

function courseList() {
  const rows = A.courses.map(c => `<tr class="border-b border-slate-200 ${c.published ? '' : 'opacity-60'}"><td class="p-3 w-20"><div class="w-16">${thumb({ id: c.id, i: c.icon, thumb: c.thumbnail_url }, 'rounded')}</div></td>
   <td class="p-3"><b>${esc(c.title)}</b><div class="text-xs text-ov">id ${c.id} · ${esc((ADM_CATS.find(k => k[0] === c.category) || [])[1] || c.category)} · ${esc(c.duration)}</div></td>
   <td class="p-3 whitespace-nowrap">${c.price ? m(c.price) : '<b class="text-t">Free</b>'}</td><td class="p-3 text-center"><a class="text-p font-bold underline" href="/admin/lessons/${c.id}">${A.counts[c.id] || 0}</a></td>
   <td class="p-3 text-center"><input type="checkbox" class="accent-black w-4 h-4" ${c.published ? 'checked' : ''} onchange="adminToggle(${c.id},this.checked)" aria-label="Published"></td>
   <td class="p-3 whitespace-nowrap text-right"><a href="/admin/course/${c.id}" class="btn bs">Edit</a> <a href="/admin/lessons/${c.id}" class="btn bs">Lessons</a>${c.slug && c.published ? ` <a href="/course/${esc(c.slug)}/" class="btn bs" target="_blank">View</a>` : ''}</td></tr>`).join('');
  return bar('Courses', '<a href="/admin/course/new" class="btn bg-white text-black">+ Add new course</a>') +
   `<section class="${sec} py-6"><div class="card p-4 text-sm bg-teal-50 mb-5">After you save a course, the public website (and Google pages) refreshes automatically in about 1–2 minutes. Lessons and videos go live instantly.</div>
   <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase text-ov border-b border-slate-300"><th class="p-3"></th><th class="p-3">Course</th><th class="p-3">Price</th><th class="p-3 text-center">Lessons</th><th class="p-3 text-center">Published</th><th class="p-3"></th></tr></thead><tbody>${rows || '<tr><td class="p-6 text-ov" colspan="6">No courses yet.</td></tr>'}</tbody></table></div></section>`;
}
async function adminToggle(id, v) {
  const { error } = await sb.from('courses').update({ published: v }).eq('id', id);
  if (error) { toast(friendly(error), 'err'); A.courses = null; return route(1); }
  const c = A.courses.find(r => r.id === id); if (c) c.published = v;
  toast(v ? 'Published. Website updates in 1–2 minutes.' : 'Hidden from the website (draft).'); route(1);
}

function courseForm(x) {
  const isNew = x === 'new', c = isNew ? { published: true, category: 'computer', price: 0, mrp: 0, instructor: 'GCI India Faculty', icon: 'school', learn: [], faq: [], sort_order: 100, rating: 0, rating_count: 0 } : A.courses.find(r => r.id == x);
  if (!c) return msgV('Course not found', 'This course does not exist.', '/admin', 'Back to courses');
  return bar(isNew ? 'Add a new course' : 'Edit course') + `<section class="max-w-3xl mx-auto px-4 py-8"><form onsubmit="adminSave(event,${isNew ? 'null' : c.id})" class="flex flex-col gap-5">
  <div class="card p-5 flex flex-col gap-4"><h2 class="font-extrabold text-lg">Basic details</h2>
   ${lbl('Course title *', inp('title', c.title, 'required maxlength="120"'))}
   <div class="grid sm:grid-cols-2 gap-4">${lbl('Category *', `<select name="category" class="${IN} mt-1 font-normal">${ADM_CATS.map(k => `<option value="${k[0]}" ${c.category === k[0] ? 'selected' : ''}>${k[1]}</option>`).join('')}</select>`)}
   ${lbl('Duration *', inp('duration', c.duration, 'required placeholder="e.g. 3 Months"'), '3 Months, 6 Weeks, 10 Days')}</div>
   <div class="grid sm:grid-cols-2 gap-4">${lbl('Price in ₹ *', inp('price', c.price, 'type="number" min="0" required'), '0 = free course')}${lbl('Original price (strike-through)', inp('mrp', c.mrp, 'type="number" min="0"'), 'Leave 0 to auto-set')}</div>
   ${lbl('Short description *', area('description', c.description, 2, 'required maxlength="300"'), 'One or two lines, shown on course cards')}</div>
  <div class="card p-5 flex flex-col gap-4"><h2 class="font-extrabold text-lg">Thumbnail</h2>
   <div class="flex gap-4 items-center"><div class="w-40 shrink-0" id="thumbprev">${thumb({ id: c.id || 1, i: c.icon, thumb: c.thumbnail_url }, 'rounded')}</div><div class="flex-1">${lbl('Upload image (JPG/PNG/WebP, max 2 MB, 16:9 like 750×422)', `<input type="file" accept="image/jpeg,image/png,image/webp" onchange="adminUpload(this)" class="block mt-1 text-sm font-normal">`)}<div id="upmsg" class="text-xs mt-1"></div></div></div>
   ${lbl('…or paste an image link', inp('thumbnail_url', c.thumbnail_url, 'type="url" placeholder="https://..."'))}</div>
  <div class="card p-5 flex flex-col gap-4"><h2 class="font-extrabold text-lg">Content (this is what Google reads)</h2>
   ${lbl('About this course (2–4 sentences)', area('long_description', c.long_description, 5), 'Unique text for every course ranks better. Blank = auto-written from the short description.')}
   ${lbl('What students will learn', area('learn', (c.learn || []).join('\n'), 5), 'One point per line (at least 3)')}
   ${lbl('Questions & answers', area('faq', (c.faq || []).map(q => q.join(' | ')).join('\n'), 4), 'One per line:  Question | Answer')}
   ${lbl('Instructor name', inp('instructor', c.instructor))}</div>
  <details class="card p-5"><summary class="font-extrabold text-lg">Advanced (optional)</summary><div class="flex flex-col gap-4 mt-4">
   ${lbl('Page link name (slug)', inp('slug', c.slug, 'pattern="[a-z0-9-]+" placeholder="auto from title"'), 'Lower-case letters, numbers and dashes. Do not change it after the course is live.')}
   ${lbl('Google title (max ~60 characters)', inp('seo_title', c.seo_title, 'maxlength="70"'))}${lbl('Google description (max ~155 characters)', area('seo_desc', c.seo_desc, 2, 'maxlength="180"'))}
   <div class="grid sm:grid-cols-3 gap-4">${lbl('Badge text', inp('tag', c.tag, 'placeholder="Bestseller"'))}${lbl('Icon name', inp('icon', c.icon), 'fonts.google.com/icons')}${lbl('Order on site', inp('sort_order', c.sort_order, 'type="number"'), 'Smaller = earlier')}</div>
   <div class="grid sm:grid-cols-3 gap-4">${lbl('Rating (0–5)', inp('rating', c.rating, 'type="number" step="0.1" min="0" max="5"'), 'Keep 0 until you have genuine reviews')}${lbl('Number of ratings', inp('rating_count', c.rating_count, 'type="number" min="0"'))}
   <label class="flex items-center gap-2 text-sm font-semibold mt-6"><input type="checkbox" name="real_rating" class="accent-black w-4 h-4" ${c.real_rating ? 'checked' : ''}> Ratings are genuine (show in Google)</label></div></div></details>
  <label class="flex items-center gap-2 font-semibold"><input type="checkbox" name="published" class="accent-black w-5 h-5" ${c.published ? 'checked' : ''}> Published (visible on the website)</label>
  <div id="msg" role="alert" aria-live="polite" hidden></div>
  <div class="flex gap-3"><button type="submit" class="btn bp py-3 px-8">Save course</button><a href="/admin" class="btn bs py-3">Cancel</a></div></form></section>`;
}
async function adminUpload(input) {
  const f = input.files[0], msg = $('#upmsg'); if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { msg.textContent = 'Please choose a JPG, PNG or WebP image.'; msg.className = 'text-xs mt-1 text-red-700'; return; }
  if (f.size > 2 * 1024 * 1024) { msg.textContent = 'Image is larger than 2 MB. Please compress it.'; msg.className = 'text-xs mt-1 text-red-700'; return; }
  msg.textContent = 'Uploading…'; msg.className = 'text-xs mt-1 text-ov';
  const path = Date.now() + '-' + f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const { error } = await sb.storage.from('thumbnails').upload(path, f, { contentType: f.type, cacheControl: '31536000' });
  if (error) { msg.textContent = 'Upload failed: ' + error.message; msg.className = 'text-xs mt-1 text-red-700'; return; }
  const url = sb.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
  document.querySelector('input[name=thumbnail_url]').value = url;
  $('#thumbprev').innerHTML = `<img src="${esc(url)}" alt="" class="w-full aspect-video object-cover rounded">`;
  msg.textContent = 'Uploaded ✔ (click Save course to keep it)'; msg.className = 'text-xs mt-1 text-t font-bold';
}
async function adminSave(ev, id) {
  ev.preventDefault(); const f = ev.target, e = f.elements, b = f.querySelector('[type=submit]');
  const title = e.title.value.trim(), price = parseInt(e.price.value || '0', 10), mrp = parseInt(e.mrp.value || '0', 10);
  const learn = e.learn.value.split('\n').map(s => s.trim()).filter(Boolean);
  const faq = e.faq.value.split('\n').map(s => s.split('|').map(x => x.trim())).filter(p => p[0] && p[1]).map(p => [p[0], p.slice(1).join(' | ')]);
  const slug = (e.slug.value.trim() || slugify(title));
  if (title.length < 3) return say('#msg', 'Please enter the course title.');
  if (!(price >= 0)) return say('#msg', 'Price must be 0 or more.');
  if (price && mrp && mrp < price) return say('#msg', 'Original price cannot be lower than the price.');
  if (e.learn.value.trim() && learn.length < 3) return say('#msg', 'Please give at least 3 "what you will learn" points (one per line).');
  if (!/^[a-z0-9-]+$/.test(slug)) return say('#msg', 'Link name can only have lower-case letters, numbers and dashes.');
  const row = { title, slug, category: e.category.value, price, mrp: price ? (mrp || price * 2) : 0, duration: e.duration.value.trim(), description: e.description.value.trim(), long_description: e.long_description.value.trim(), instructor: e.instructor.value.trim() || 'GCI India Faculty',
    tag: e.tag.value.trim(), icon: e.icon.value.trim() || 'school', thumbnail_url: e.thumbnail_url.value.trim() || null, seo_title: e.seo_title.value.trim(), seo_desc: e.seo_desc.value.trim(), learn, faq,
    rating: parseFloat(e.rating.value || '0') || 0, rating_count: parseInt(e.rating_count.value || '0', 10) || 0, real_rating: e.real_rating.checked, published: e.published.checked, sort_order: parseInt(e.sort_order.value || '100', 10) || 100 };
  busy(b, true);
  const { data, error } = id ? await sb.from('courses').update(row).eq('id', id).select().single() : await sb.from('courses').insert(row).select().single();
  busy(b, false);
  if (error) return say('#msg', error.code === '23505' ? 'This link name (slug) is already used by another course.' : friendly(error));
  A.courses = null; toast('Saved ✔ The website updates in about 1–2 minutes.');
  if (!id && data) go('/admin/lessons/' + data.id); else go('/admin');
}

/* ---- lessons: one line per lesson  "Title | video link | duration" ---- */
function lessonsV(cid) {
  const c = A.courses.find(r => r.id === cid); if (!c) return msgV('Course not found', '', '/admin', 'Back');
  if (!A.lessons[cid]) { sb.from('lessons').select('*').eq('course_id', cid).order('lesson_no').order('id').then(({ data, error }) => { if (error) toast(friendly(error), 'err'); A.lessons[cid] = data || []; route(1); }); return spinner(); }
  const text = A.lessons[cid].map(l => [l.title, l.video_url || '', l.duration || ''].join(' | ')).join('\n');
  return bar('Lessons', `<a href="/admin/course/${cid}" class="btn bg-white text-black">Edit course</a>`) + `<section class="max-w-3xl mx-auto px-4 py-8"><h2 class="font-bold text-lg">${esc(c.title)}</h2>
  <p class="text-sm text-ov mt-1 mb-4">Write <b>one lesson per line</b> in this format: <code class="bg-cl px-1">Lesson title | video link | duration</code>. The video link can be YouTube (unlisted) or Vimeo; leave it empty if the video is not ready. The first line is lesson 1, the second is lesson 2, and so on.</p>
  <form onsubmit="adminSaveLessons(event,${cid})" class="flex flex-col gap-4"><textarea name="lines" rows="14" spellcheck="false" placeholder="Introduction | https://youtu.be/xxxxxxxxxxx | 12:30&#10;Installing the tools | https://youtu.be/yyyyyyyyyyy | 18:05" class="${IN} font-mono text-xs">${esc(text)}</textarea>
  <div id="msg" role="alert" aria-live="polite" hidden></div><div class="flex gap-3 items-center"><button type="submit" class="btn bp py-3 px-8">Save lessons</button><span class="text-sm text-ov">${A.lessons[cid].length} lessons now</span></div></form>
  <p class="text-xs text-ov mt-4">Tip: to add more lessons, add new lines at the bottom. Reordering or removing lines changes which lesson each student's progress belongs to, so avoid removing lessons after students have started.</p></section>`;
}
async function adminSaveLessons(ev, cid) {
  ev.preventDefault(); const b = ev.target.querySelector('[type=submit]'), ex = A.lessons[cid] || [];
  const lines = ev.target.elements.lines.value.split('\n').map(s => s.trim()).filter(Boolean).map(s => { const p = s.split('|').map(x => x.trim()); return { title: p[0], video_url: p[1] || null, duration: p[2] || null }; });
  if (lines.some(l => !l.title)) return say('#msg', 'Every line needs a lesson title before the first |');
  if (lines.some(l => l.title.length > 200)) return say('#msg', 'A lesson title is too long (max 200 characters).');
  const del = ex.slice(lines.length);
  if (del.length && !confirm(`${del.length} lesson(s) will be deleted, and students' progress on them will be lost. Continue?`)) return;
  busy(b, true); let err = null;
  for (let i = 0; i < Math.min(lines.length, ex.length) && !err; i++) {
    const o = ex[i], n = lines[i];
    if (o.title !== n.title || (o.video_url || null) !== n.video_url || (o.duration || null) !== n.duration || o.lesson_no !== i + 1) err = (await sb.from('lessons').update({ ...n, lesson_no: i + 1 }).eq('id', o.id)).error;
  }
  if (!err && lines.length > ex.length) err = (await sb.from('lessons').insert(lines.slice(ex.length).map((n, k) => ({ ...n, course_id: cid, lesson_no: ex.length + k + 1 })))).error;
  if (!err && del.length) err = (await sb.from('lessons').delete().in('id', del.map(d => d.id))).error;
  busy(b, false);
  if (err) return say('#msg', friendly(err));
  delete A.lessons[cid]; A.courses = null; toast('Lessons saved ✔ (live immediately)'); go('/admin');
}

/* ================= LIVE CLASSES (admin) ================= */
const ADM_PLAT = ['Google Meet', 'Zoom', 'YouTube Live', 'Other'];
const toIst = iso => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T').slice(0, 16);
async function liveAdminLoad() {
  A.liveBusy = true;
  const [c, r] = await Promise.all([sb.from('live_classes').select('*').order('starts_at'), sb.from('live_registrations').select('class_id')]);
  if (c.error) toast(friendly(c.error), 'err');
  A.live = (c.data || []).slice().sort((x, y) => new Date(y.starts_at) - new Date(x.starts_at)); A.regCount = {}; (r.data || []).forEach(x => A.regCount[x.class_id] = (A.regCount[x.class_id] || 0) + 1);
  A.liveBusy = false; route(1);
}
function liveAdminList() {
  if (!A.live) { if (!A.liveBusy) liveAdminLoad(); return bar('Live classes') + spinner(); }
  const rows = A.live.map(c => `<tr class="border-b border-slate-200 ${c.published ? '' : 'opacity-60'}"><td class="p-3 whitespace-nowrap text-sm">${esc(istFmt(c.starts_at))}</td><td class="p-3"><b>${esc(c.title)}</b><div class="text-xs text-ov">${esc(c.platform)} · ${c.duration_min} min${c.host ? ' · ' + esc(c.host) : ''}</div></td>
   <td class="p-3 text-center"><a class="text-p font-bold underline" href="/admin/livestudents/${c.id}">${A.regCount[c.id] || 0}</a></td><td class="p-3 text-center"><input type="checkbox" class="accent-black w-4 h-4" ${c.published ? 'checked' : ''} onchange="liveToggle(${c.id},this.checked)" aria-label="Published"></td>
   <td class="p-3 text-right whitespace-nowrap"><a href="/admin/liveform/${c.id}" class="btn bs">Edit</a> <a href="/admin/livestudents/${c.id}" class="btn bs">Students</a> <button onclick="liveDelete(${c.id})" class="btn bs text-red-700">Delete</button></td></tr>`).join('');
  return bar('Live classes', '<a href="/admin/liveform/new" class="btn bg-white text-black">+ Schedule a class</a>') + `<section class="${sec} py-6"><div class="card p-4 text-sm bg-teal-50 mb-5">Students register on the <b>Live classes</b> page. The meeting link is shown to registered students only, from 15 minutes before the start time. Times are entered in IST.</div>
   <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase text-ov border-b border-slate-300"><th class="p-3">When (IST)</th><th class="p-3">Class</th><th class="p-3 text-center">Registered</th><th class="p-3 text-center">Published</th><th class="p-3"></th></tr></thead><tbody>${rows || '<tr><td class="p-6 text-ov" colspan="5">No classes yet. Click “Schedule a class”.</td></tr>'}</tbody></table></div></section>`;
}
async function liveToggle(id, v) { const { error } = await sb.from('live_classes').update({ published: v }).eq('id', id); if (error) toast(friendly(error), 'err'); A.live = null; route(1); }
async function liveDelete(id) {
  if (!confirm('Delete this class and all its registrations?')) return;
  const { error } = await sb.from('live_classes').delete().eq('id', id); if (error) return toast(friendly(error), 'err');
  A.live = null; toast('Class deleted.'); route(1);
}
function liveForm(x) {
  const isNew = x === 'new';
  if (!isNew && !A.live) { if (!A.liveBusy) liveAdminLoad(); return bar('Live class') + spinner(); }
  const c = isNew ? { title: '', description: '', host: '', platform: 'Google Meet', duration_min: 60, published: true, course_id: null } : A.live.find(r => r.id == x);
  if (!c) return msgV('Class not found', '', '/admin/live', 'Back');
  if (!isNew && !A.links[c.id]) { sb.from('live_links').select('*').eq('class_id', c.id).maybeSingle().then(({ data }) => { A.links[c.id] = data || { join_url: '', recording_url: '' }; route(1); }); return bar('Live class') + spinner(); }
  const l = isNew ? { join_url: '', recording_url: '' } : A.links[c.id];
  return bar(isNew ? 'Schedule a live class' : 'Edit live class') + `<section class="max-w-3xl mx-auto px-4 py-8"><form onsubmit="liveSave(event,${isNew ? 'null' : c.id})" class="flex flex-col gap-5">
  <div class="card p-5 flex flex-col gap-4">${lbl('Class title *', inp('title', c.title, 'required maxlength="200"'))}${lbl('What will be covered', area('description', c.description, 3, 'maxlength="500"'))}
   <div class="grid sm:grid-cols-2 gap-4">${lbl('Date & time (IST) *', inp('starts_at', c.starts_at ? toIst(c.starts_at) : '', 'type="datetime-local" required'), 'Indian time')}${lbl('Duration (minutes) *', inp('duration_min', c.duration_min, 'type="number" min="5" max="600" required'))}</div>
   <div class="grid sm:grid-cols-2 gap-4">${lbl('Platform', `<select name="platform" class="${IN} mt-1 font-normal">${ADM_PLAT.map(p => `<option ${c.platform === p ? 'selected' : ''}>${p}</option>`).join('')}</select>`)}${lbl('Mentor name', inp('host', c.host))}</div>
   ${lbl('Related course (optional)', `<select name="course_id" class="${IN} mt-1 font-normal"><option value="">— none —</option>${A.courses.map(k => `<option value="${k.id}" ${c.course_id == k.id ? 'selected' : ''}>${esc(k.title)}</option>`).join('')}</select>`)}</div>
  <div class="card p-5 flex flex-col gap-4"><h2 class="font-extrabold">Links (shown only to registered students)</h2>
   ${lbl('Meeting / live link', inp('join_url', l.join_url, 'type="url" placeholder="https://meet.google.com/..."'), 'Google Meet, Zoom or YouTube Live link. It opens 15 minutes before the start.')}
   ${lbl('Recording link (add after the class)', inp('recording_url', l.recording_url, 'type="url" placeholder="https://youtu.be/..."'), 'Registered students see “Watch recording” once the class is over.')}</div>
  <label class="flex items-center gap-2 font-semibold"><input type="checkbox" name="published" class="accent-black w-5 h-5" ${c.published ? 'checked' : ''}> Published (visible on the website)</label>
  <div id="msg" role="alert" aria-live="polite" hidden></div><div class="flex gap-3"><button type="submit" class="btn bp py-3 px-8">Save class</button><a href="/admin/live" class="btn bs py-3">Cancel</a></div></form></section>`;
}
async function liveSave(ev, id) {
  ev.preventDefault(); const f = ev.target, e = f.elements, b = f.querySelector('[type=submit]');
  const start = new Date(e.starts_at.value + ':00+05:30'), join = e.join_url.value.trim(), rec = e.recording_url.value.trim();
  if (e.title.value.trim().length < 3) return say('#msg', 'Please enter the class title.');
  if (isNaN(start)) return say('#msg', 'Please choose the date and time.');
  if ((join && !/^https:\/\//i.test(join)) || (rec && !/^https:\/\//i.test(rec))) return say('#msg', 'Links must start with https://');
  const row = { title: e.title.value.trim(), description: e.description.value.trim(), course_id: e.course_id.value ? +e.course_id.value : null, starts_at: start.toISOString(), duration_min: parseInt(e.duration_min.value, 10) || 60, platform: e.platform.value, host: e.host.value.trim(), published: e.published.checked };
  busy(b, true);
  const { data, error } = id ? await sb.from('live_classes').update(row).eq('id', id).select().single() : await sb.from('live_classes').insert(row).select().single();
  if (error) { busy(b, false); return say('#msg', friendly(error)); }
  const r2 = await sb.from('live_links').upsert({ class_id: data.id, join_url: join, recording_url: rec }, { onConflict: 'class_id' });
  busy(b, false); if (r2.error) return say('#msg', friendly(r2.error));
  A.live = null; delete A.links[data.id]; toast('Class saved ✔'); go('/admin/live');
}
async function loadRegs(id) {
  const r = await sb.from('live_registrations').select('*').eq('class_id', id), ids = (r.data || []).map(x => x.user_id);
  const p = ids.length ? await sb.from('profiles').select('id,full_name,mobile').in('id', ids) : { data: [] };
  A.regs[id] = (r.data || []).map(x => ({ ...x, ...((p.data || []).find(q => q.id === x.user_id) || {}) })); route(1);
}
function liveStudents(id) {
  if (!A.live) { if (!A.liveBusy) liveAdminLoad(); return bar('Registered students') + spinner(); }
  const c = A.live.find(r => r.id === id); if (!c) return msgV('Class not found', '', '/admin/live', 'Back');
  if (!A.regs[id]) { loadRegs(id); return bar('Registered students') + spinner(); }
  const L = A.regs[id], nums = L.map(s => s.mobile).filter(Boolean);
  return bar('Registered students', `<button onclick="navigator.clipboard.writeText(${esc(JSON.stringify(nums.join(', ')))}).then(()=>toast('Mobile numbers copied'))" class="btn bg-white text-black">Copy all mobile numbers</button>`) + `<section class="${sec} py-6"><h2 class="font-bold text-lg">${esc(c.title)}</h2><p class="text-sm text-ov mb-4">${esc(istFmt(c.starts_at))} · ${L.length} registered</p>
   <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs uppercase text-ov border-b border-slate-300"><th class="p-3">Name</th><th class="p-3">Mobile</th><th class="p-3">Registered</th></tr></thead><tbody>${L.map(s => `<tr class="border-b border-slate-200"><td class="p-3">${esc(s.full_name || '—')}</td><td class="p-3">${s.mobile ? `<a class="text-p underline" target="_blank" rel="noopener" href="https://wa.me/91${esc(s.mobile.slice(-10))}">${esc(s.mobile)}</a>` : '—'}</td><td class="p-3 text-ov">${esc(istFmt(s.created_at))}</td></tr>`).join('') || '<tr><td class="p-6 text-ov" colspan="3">Nobody has registered yet.</td></tr>'}</tbody></table></div></section>`;
}

/* ================= NOTES & PDFs (admin) ================= */
async function notesAdminLoad() { A.notesBusy = true; const r = await sb.from('notes').select('*').order('id'); if (r.error) toast(friendly(r.error), 'err'); A.notes = (r.data || []).slice().reverse(); A.notesBusy = false; route(1); }
function notesAdmin() {
  if (!A.notes) { if (!A.notesBusy) notesAdminLoad(); return bar('Notes & PDFs') + spinner(); }
  const rows = A.notes.map(n => { const c = A.courses.find(k => k.id === n.course_id); return `<tr class="border-b border-slate-200"><td class="p-3"><b>${esc(n.title)}</b><div class="text-xs text-ov">${esc(n.file_name)} · ${fmtSize(n.file_size)}</div></td><td class="p-3 text-sm">${n.is_free ? '<b class="text-t">Free for everyone</b>' : esc(c ? c.title : 'Course')}</td><td class="p-3 text-right whitespace-nowrap"><button onclick="adminOpenNote(${n.id})" class="btn bs">Open</button> <button onclick="adminDeleteNote(${n.id})" class="btn bs text-red-700">Delete</button></td></tr>`; }).join('');
  return bar('Notes & PDFs') + `<section class="max-w-4xl mx-auto px-4 py-6"><form onsubmit="adminAddNote(event)" class="card p-5 flex flex-col gap-4"><h2 class="font-extrabold text-lg">Upload a new PDF</h2>
   ${lbl('Title *', inp('title', '', 'required maxlength="200" placeholder="e.g. CCC Chapter 1 – Computer Basics"'))}${lbl('Short description', area('description', '', 2, 'maxlength="300"'))}
   ${lbl('Who can read it? *', `<select name="audience" class="${IN} mt-1 font-normal"><option value="free">Free for everyone (public, also helps Google)</option>${A.courses.map(k => `<option value="${k.id}">Only students enrolled in: ${esc(k.title)}</option>`).join('')}</select>`)}
   ${lbl('PDF file * (max 20 MB)', '<input name="file" type="file" accept="application/pdf" required class="block mt-1 text-sm font-normal">')}
   <div id="msg" role="alert" aria-live="polite" hidden></div><div><button type="submit" class="btn bp py-3 px-8">Upload PDF</button></div></form>
   <h2 class="font-extrabold text-lg mt-8 mb-2">All notes (${A.notes.length})</h2><div class="overflow-x-auto"><table class="w-full text-sm"><tbody>${rows || '<tr><td class="p-6 text-ov">No notes uploaded yet.</td></tr>'}</tbody></table></div>
   <p class="text-xs text-ov mt-3">To replace a file, delete it and upload the new one.</p></section>`;
}
async function adminAddNote(ev) {
  ev.preventDefault(); const f = ev.target, e = f.elements, b = f.querySelector('[type=submit]'), file = e.file.files[0];
  if (!file) return say('#msg', 'Please choose a PDF file.');
  if (file.type !== 'application/pdf') return say('#msg', 'Only PDF files are allowed.');
  if (file.size > 20 * 1024 * 1024) return say('#msg', 'File is larger than 20 MB. Please compress it.');
  const free = e.audience.value === 'free', cid = free ? null : +e.audience.value, bucket = free ? 'free-notes' : 'course-notes';
  const path = (free ? '' : 'c' + cid + '/') + Date.now() + '-' + file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  busy(b, true);
  const up = await sb.storage.from(bucket).upload(path, file, { contentType: 'application/pdf', cacheControl: '3600' });
  if (up.error) { busy(b, false); return say('#msg', 'Upload failed: ' + up.error.message); }
  const { error } = await sb.from('notes').insert({ course_id: cid, title: e.title.value.trim(), description: e.description.value.trim(), file_path: path, file_name: file.name, file_size: file.size, is_free: free });
  busy(b, false);
  if (error) { await sb.storage.from(bucket).remove([path]); return say('#msg', friendly(error)); }
  A.notes = null; NT.free = null; NT.mine = null; toast('PDF uploaded ✔'); route(1);
}
async function adminDeleteNote(id) {
  const n = A.notes.find(x => x.id === id); if (!n || !confirm('Delete "' + n.title + '"? Students will no longer be able to open it.')) return;
  await sb.storage.from(n.is_free ? 'free-notes' : 'course-notes').remove([n.file_path]);
  const { error } = await sb.from('notes').delete().eq('id', id); if (error) return toast(friendly(error), 'err');
  A.notes = null; NT.free = null; NT.mine = null; toast('Deleted.'); route(1);
}
async function adminOpenNote(id) {
  const n = A.notes.find(x => x.id === id), w = window.open('', '_blank');
  const url = n.is_free ? sb.storage.from('free-notes').getPublicUrl(n.file_path).data.publicUrl : (await sb.storage.from('course-notes').createSignedUrl(n.file_path, 300)).data?.signedUrl;
  if (url && w) { w.opener = null; w.location.href = url; } else if (w) w.close();
}
