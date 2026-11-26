-- Run ONCE in the Supabase SQL editor on the existing project (schema.sql already has this for fresh projects).
-- Allows custom work types (typed in the app) next to the 4 built-in ones.
-- Until this is run, saving a work with a NEW custom type fails; the 4 built-in types keep working.
alter table artwork drop constraint if exists artwork_type_check;
