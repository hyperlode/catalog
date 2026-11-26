-- Run ONCE in the Supabase SQL editor on the existing project (schema.sql already contains this column
-- for fresh projects). Do this BEFORE publishing the app version that sends `status`, otherwise saving fails.
alter table artwork
  add column if not exists status text check (status in ('study', 'process', 'finaal'));
