/* Optional: rebuild css/tailwind.css yourself after changing classes (needs Node.js):
   npx tailwindcss@3.4.17 -c build/tailwind.config.js -i build/tailwind-input.css -o css/tailwind.css --minify */
module.exports = { content: ['./**/*.html', './js/**/*.js'], theme: { extend: { colors: { p: '#2457d6', pc: '#4a74e6', t: '#005350', tc: '#006d6a', s: '#ffffff', c: '#eef1f4', cl: '#f7f9fa', ch: '#e3e8ee', ov: '#5f6368' } } } };
