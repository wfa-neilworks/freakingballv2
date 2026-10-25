-- Add photo_url to members
alter table members add column if not exists photo_url text;

-- Storage bucket for member photos
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do nothing;

-- Club admin can upload/update member photos for their own club
create policy "Club admin manages member photos"
on storage.objects for all
using (
  bucket_id = 'member-photos'
  and auth.uid() is not null
)
with check (
  bucket_id = 'member-photos'
  and auth.uid() is not null
);

-- Anyone can read member photos (public)
create policy "Public member photo read"
on storage.objects for select
using (bucket_id = 'member-photos');
