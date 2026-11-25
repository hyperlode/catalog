// supabase-js is vendored in js/vendor/supabase.js (UMD build, global `supabase`),
// so the site works from file:// and needs no CDN or build step.
const isConfigured = !CONFIG.SUPABASE_URL.includes('YOUR-') && !CONFIG.SUPABASE_ANON_KEY.includes('YOUR-');

const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Demo-mode pictures are data:/blob: URLs and are used as they are.
const publicUrl = (path) => /^(data|blob):/.test(path) ? path : db.storage.from(CONFIG.BUCKET).getPublicUrl(path).data.publicUrl;

// Shared login state, kept current by app.js.
const auth = { loggedIn: false };
