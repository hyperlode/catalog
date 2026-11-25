-- Run once in the Supabase SQL editor of the project.
-- Also in the dashboard: Authentication > Providers > Email: DISABLE "Allow new users to sign up",
-- then create the single user by hand (Authentication > Users > Add user, auto-confirm).
-- With sign-ups off, "authenticated" below means exactly that one user.

create table category (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
create unique index category_name_unique on category (lower(name));

create table artwork (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  date           date not null,
  date_precision text not null default 'day' check (date_precision in ('year', 'month', 'day')),
  type           text not null check (type in ('sculpture', 'drawing', 'painting', 'watercolour')),
  description    text,
  category_id    uuid references category (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index artwork_date_idx on artwork (date);
create index artwork_category_idx on artwork (category_id);

create table artwork_image (
  id                uuid primary key default gen_random_uuid(),
  artwork_id        uuid not null references artwork (id) on delete cascade,
  position          int  not null default 0,
  original_filename text,
  path_original     text not null,
  path_web          text not null,
  path_thumb        text not null,
  created_at        timestamptz not null default now()
);
create index artwork_image_artwork_idx on artwork_image (artwork_id);

-- Row Level Security: everyone may read, only the logged-in user may write.
alter table category      enable row level security;
alter table artwork       enable row level security;
alter table artwork_image enable row level security;

create policy "public read"  on category      for select to anon, authenticated using (true);
create policy "public read"  on artwork        for select to anon, authenticated using (true);
create policy "public read"  on artwork_image  for select to anon, authenticated using (true);

create policy "owner insert" on category      for insert to authenticated with check (true);
create policy "owner update" on category      for update to authenticated using (true) with check (true);
create policy "owner delete" on category      for delete to authenticated using (true);
create policy "owner insert" on artwork       for insert to authenticated with check (true);
create policy "owner update" on artwork       for update to authenticated using (true) with check (true);
create policy "owner delete" on artwork       for delete to authenticated using (true);
create policy "owner insert" on artwork_image for insert to authenticated with check (true);
create policy "owner update" on artwork_image for update to authenticated using (true) with check (true);
create policy "owner delete" on artwork_image for delete to authenticated using (true);

-- Image storage: public bucket (files are readable by URL), writes only for the logged-in user.
insert into storage.buckets (id, name, public) values ('artworks', 'artworks', true)
  on conflict (id) do nothing;

create policy "artworks insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artworks');
create policy "artworks update" on storage.objects for update to authenticated
  using (bucket_id = 'artworks');
create policy "artworks delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artworks');
