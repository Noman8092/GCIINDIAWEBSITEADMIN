# GCI India – Website (SEO-ready)

Static site + Supabase backend (login, dashboard, lessons, certificates). Every public page has its **own real URL and real HTML** so Google can index it:

`/`, `/courses/`, `/courses/computer/` (web, marketing, ecommerce), `/free-courses/`, `/course/<slug>/` (one per course), `/about-us/`, `/contact-us/`, `/live-classes/`, `/notes-and-pdfs/`, `/verify-certificate/`.
Private pages (`/dashboard`, `/learn/…`, `/login` …) are served from `app.html`, marked `noindex` and blocked in `robots.txt`.

## 0. Add & manage courses from the website (Admin panel)
Courses, thumbnails and lessons are managed at **https://your-domain/admin** – no code, no terminal, no git.
**One-time setup**
1. Supabase → SQL Editor → run `supabase/004_admin_and_courses.sql`, then `supabase/005_seed_courses.sql`.
2. Sign up on your site, then run in SQL Editor (your email): `update public.profiles set is_admin = true where id = (select id from auth.users where email = 'YOUR-EMAIL');`
3. Netlify → Project configuration → Build & deploy → **Build hooks → Add build hook** (name `supabase`, branch `main`) → copy the URL.
4. Supabase → Integrations → **Database Webhooks → Create**: table `courses`, events Insert + Update + Delete, type *HTTP Request*, method POST, URL = the Netlify build hook URL.
5. `git push` this folder once (Netlify now runs `python3 build/build.py`, which reads courses from Supabase and regenerates every SEO page).
**Daily use:** open `/admin` → *Add new course* → fill the form (upload a thumbnail from your computer) → Save → add lessons (one line per lesson: `title | video link | duration`). The public site and Google pages refresh by themselves in 1–2 minutes (lessons are live instantly). Any number of courses and lessons.

### Live classes, Notes & PDFs, About page
- One-time: run `supabase/006_live_and_notes.sql` in Supabase → SQL Editor (it also fixes public course loading for visitors).
- **Live classes** (`/admin/live`): schedule a class (time in IST), add the Meet/Zoom/YouTube link, publish. Students register on `/live-classes/`; the link appears for registered students 15 minutes before the start, and after the class they can watch the recording link you add. `Students` shows who registered with their mobile number (tap to open WhatsApp, or copy all numbers).
- **Notes & PDFs** (`/admin/notes`): upload PDFs (max 20 MB). *Free for everyone* = public notes shown on `/notes-and-pdfs/` (good for Google). *Only students enrolled in a course* = private; those students read or download it on the Notes page and inside the course's lesson page.
- **About page**: edit the text in `js/about.js` (add your team, email and address), then run `python3 build/build.py` and push.

## 1. Set your domain (do this first!)
1. Edit `build/site.json` → `"siteUrl": "https://your-real-domain.com"` (no trailing slash). Fill `phone`, `email`, `address` (if you have a physical institute), `sameAs` (Facebook / Instagram / YouTube links), optional `googleSiteVerification`, `bingSiteVerification`, `ga4MeasurementId`.
2. Run `python3 build/build.py` (needs only Python 3). It regenerates every page, `sitemap.xml`, `robots.txt` and `js/meta.js` with your domain.
3. Run this again whenever you change `js/data.js` (courses), `build/site.json` or `build/template.html`.

## 2. Run locally
`python3 serve.py` → http://localhost:8000 (same routing rules as production; VS Code "Live Server" does not support these URLs).

## 3. Deploy (publish the whole folder)
- **Netlify** (easiest): drag-drop the folder at app.netlify.com/drop. Rules are in `netlify.toml`.
- **Vercel**: `npx vercel --prod` (uses `vercel.json`).
- **cPanel / any Apache hosting**: upload everything to `public_html` (uses `.htaccess`; turn on HTTPS and uncomment the HTTPS redirect inside it).
- GitHub Pages is not recommended (it cannot serve `/dashboard` and `/learn/…` URLs).

## 4. After going live (this is what actually gets you on Google)
1. **Google Search Console** → add your domain → verify (paste the code in `site.json`, rebuild) → *Sitemaps* → submit `https://your-domain/sitemap.xml` → *URL Inspection* → "Request indexing" for `/` and each course page.
2. **Bing Webmaster Tools** → import from Search Console.
3. **Google Business Profile** (free) if you run a physical institute: gives local "computer institute near me" visibility.
4. Share course links on YouTube descriptions, Instagram bio, WhatsApp and local directories. Backlinks from real sites are a major ranking factor.
5. Check speed at pagespeed.web.dev and structured data at search.google.com/test/rich-results.
Rankings take weeks to months and nobody can guarantee a #1 position. Fresh, useful content (blog posts, free tutorials, YouTube videos linking to the site) is what moves you up.

## 5. Content rules for good SEO
- Edit courses in the Admin panel (the *Advanced* section has the Google title/description). `js/data.js` is regenerated from the database on every build. Every course needs a unique title, description and "About this course" text.
- Keep ratings/numbers **real**. Star ratings go into Google structured data only if you set `"realRating": true` for a course with genuine reviews. Replace the sample `GCI_STATS` in `js/config.js` with true figures.
- Only claim "government recognised / ISO / NIELIT" if it is true and documented.

## 6. Supabase setup (accounts)
1. supabase.com → new project → SQL Editor → run `supabase/schema.sql`, then `004_admin_and_courses.sql` and `005_seed_courses.sql` (existing project? run only `002_lessons_migration.sql`, `003_thumbnails.sql`, `004…`, `005…` that you have not run yet).
2. Project Settings → API → copy Project URL and **anon** key into `js/config.js` (never the service_role key).
3. Authentication → URL Configuration → Site URL `https://your-domain.com`; Redirect URLs: `https://your-domain.com/` and `http://localhost:8000/`.
4. Google login: Google Cloud → OAuth client (Web), redirect URI `https://<project>.supabase.co/auth/v1/callback`; paste Client ID/Secret in Supabase → Authentication → Sign In / Providers → Google.
5. Set a custom SMTP before launch (built-in email is rate-limited).
- Lessons and thumbnails are managed in the Admin panel (see section 0). `video_url` accepts YouTube (unlisted) or Vimeo links.
- Paid course access (until payments are added): `select public.grant_enrollment('student@email.com', 4);`

## 7. Look & feel
- Home banners: `GCI_BANNERS` in `js/config.js`. Social-share image: `assets/og-image.png` (1200×630).
- CSS is pre-built in `css/tailwind.css` (fast, no CDN). If you change Tailwind classes, rebuild it: `npx tailwindcss@3.4.17 -c build/tailwind.config.js -i build/tailwind-input.css -o css/tailwind.css --minify`, or open any page with `?devcss` while developing to use the live CDN.
