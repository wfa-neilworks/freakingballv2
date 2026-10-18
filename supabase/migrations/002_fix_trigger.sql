-- Fix handle_new_user trigger to safely handle missing metadata
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when new.raw_user_meta_data->>'role' = 'super_admin' then 'super_admin'::user_role
      else 'club_admin'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
