/* Supabase keys (Project Settings → API). The anon key is PUBLIC by design;
   data is protected by Row Level Security in supabase/schema.sql.
   NEVER put the service_role key here. */
window.GCI_CONFIG = {
    SUPABASE_URL: 'https://sbsqffawkjqusrunldka.supabase.co', // e.g. 'https://abcdxyz.supabase.co'
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNic3FmZmF3a2pxdXNydW5sZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTE5NjEsImV4cCI6MjEwODAyNzk2MX0.OSqaUfe9iUOmxLifkZGTSj4XDzRW6LqTdh9Eqhi4Tv4' // the "anon / public" key
};

/* Home-page banner slides (auto-scroll). `img` is optional: paste any image URL
   (1600x500 works well) to show a photo behind the slide. Add/remove slides freely. */
window.GCI_BANNERS = [
    { bg: 'from-[#1e3a8a] via-[#2457d6] to-[#38bdf8]', title: 'Learn practical skills. Get certified.', sub: 'CCC, O Level, Excel and more, taught in Hindi & English.', cta: 'Explore courses', href: '/courses/', img: '', icons: ['desktop_windows', 'table_chart', 'workspace_premium'] },
    { bg: 'from-[#064e3b] via-[#0f766e] to-[#34d399]', title: 'Start learning free today', sub: 'Typing, computer basics and digital marketing. No card needed.', cta: 'See free courses', href: '/free-courses/', img: '', icons: ['keyboard', 'campaign', 'school'] },
    { bg: 'from-[#7c2d12] via-[#ea580c] to-[#fbbf24]', title: 'Build your online business', sub: 'Sell on Amazon, Flipkart and Meesho with step-by-step training.', cta: 'View e-commerce courses', href: '/courses/ecommerce/', img: '', icons: ['storefront', 'local_shipping', 'trending_up'] },
    { bg: 'from-[#4c1d95] via-[#7c3aed] to-[#f472b6]', title: 'Code your way to a better career', sub: 'Build real websites and a portfolio you can show employers.', cta: 'Start web development', href: '/courses/web/', img: '', icons: ['code', 'web', 'rocket_launch'] }
];

/* Numbers shown in the dark strip on the home page: [value, suffix, label].
   IMPORTANT: replace these with your REAL figures. Wrong numbers can mislead students and hurt trust. */
window.GCI_STATS = [
    [15000, '+', 'Students enrolled'],
    [8, '', 'Career courses'],
    [4, '.8★', 'Average rating'],
    [100, '%', 'Practical learning']
];