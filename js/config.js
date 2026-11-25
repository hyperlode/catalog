// Public values only. The anon key is meant to be exposed in the browser;
// security comes from the Row Level Security policies in supabase/schema.sql.
// NEVER put the service_role key in this repository.
const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
  BUCKET: 'artworks',
  SITE_TITLE: 'Archief Philippe',
};
