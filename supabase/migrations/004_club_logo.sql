-- Add logo_url to clubs
alter table clubs add column if not exists logo_url text;

-- Storage bucket for club logos
insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do nothing;

-- Club admin can upload/update their own logo
create policy "Club admin manages own logo"
on storage.objects for all
using (
  bucket_id = 'club-logos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'club-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read logos (they're public)
create policy "Public logo read"
on storage.objects for select
using (bucket_id = 'club-logos');
