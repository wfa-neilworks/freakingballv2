-- ============================================================
-- FreakingBall — Initial Schema
-- ============================================================

-- ENUMS
create type user_role as enum ('super_admin', 'club_admin');
create type club_status as enum ('pending', 'approved', 'rejected');
create type play_type as enum ('singles', 'doubles', 'mixed_doubles', 'open_doubles');
create type doubles_category as enum ('mens', 'womens');
create type partner_mode as enum ('fixed', 'rotating');
create type gender as enum ('male', 'female', 'other');
create type session_status as enum ('scheduled', 'active', 'completed', 'cancelled');
create type tournament_status as enum ('draft', 'registration', 'active', 'completed');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role user_role not null default 'club_admin',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Super admin is identified by role in profiles.
-- Seed the super admin after creating the auth user.

-- ============================================================
-- CLUBS
-- ============================================================
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  contact_email text not null,
  contact_phone text,
  status club_status not null default 'pending',
  admin_id uuid not null references profiles(id) on delete cascade,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clubs_admin_id_idx on clubs(admin_id);
create index clubs_status_idx on clubs(status);

-- ============================================================
-- MEMBERS (club members + guests)
-- ============================================================
create table members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  full_name text not null,
  nickname text,
  phone text,
  gender gender not null default 'male',
  is_guest boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_club_id_idx on members(club_id);
create index members_is_guest_idx on members(is_guest);

-- ============================================================
-- OPEN PLAYS
-- ============================================================
create table open_plays (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  play_type play_type not null,
  doubles_category doubles_category,
  partner_mode partner_mode,
  date_time timestamptz not null,
  location text not null,
  num_courts int not null check (num_courts >= 1),
  status session_status not null default 'scheduled',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index open_plays_club_id_idx on open_plays(club_id);
create index open_plays_status_idx on open_plays(status);

-- ============================================================
-- OPEN PLAY PARTICIPANTS
-- ============================================================
create table open_play_participants (
  id uuid primary key default gen_random_uuid(),
  open_play_id uuid not null references open_plays(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(open_play_id, member_id)
);

create index opp_open_play_id_idx on open_play_participants(open_play_id);
create index opp_member_id_idx on open_play_participants(member_id);

-- ============================================================
-- OPEN PLAY MATCHES
-- ============================================================
create table open_play_matches (
  id uuid primary key default gen_random_uuid(),
  open_play_id uuid not null references open_plays(id) on delete cascade,
  court_number int not null,
  round_number int not null,
  team1_player1 uuid not null references members(id),
  team1_player2 uuid references members(id),
  team2_player1 uuid not null references members(id),
  team2_player2 uuid references members(id),
  team1_score int,
  team2_score int,
  winner_team smallint check (winner_team in (1, 2)),
  played_at timestamptz,
  created_at timestamptz not null default now()
);

create index opm_open_play_id_idx on open_play_matches(open_play_id);
create index opm_round_idx on open_play_matches(open_play_id, round_number);

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  status tournament_status not null default 'draft',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_club_id_idx on tournaments(club_id);

-- ============================================================
-- TOURNAMENT EVENTS
-- ============================================================
create table tournament_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  play_type play_type not null,
  doubles_category doubles_category,
  date_time timestamptz not null,
  location text not null,
  num_courts int not null check (num_courts >= 1),
  num_pools int not null default 1 check (num_pools >= 1),
  status session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index te_tournament_id_idx on tournament_events(tournament_id);

-- ============================================================
-- TOURNAMENT REGISTRATIONS
-- ============================================================
create table tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references tournament_events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  partner_id uuid references members(id),
  pool_number int,
  registered_at timestamptz not null default now(),
  unique(event_id, member_id)
);

create index tr_event_id_idx on tournament_registrations(event_id);
create index tr_member_id_idx on tournament_registrations(member_id);

-- ============================================================
-- TOURNAMENT MATCHES
-- ============================================================
create table tournament_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references tournament_events(id) on delete cascade,
  pool_number int,
  court_number int not null,
  round_number int not null,
  team1_player1 uuid not null references members(id),
  team1_player2 uuid references members(id),
  team2_player1 uuid not null references members(id),
  team2_player2 uuid references members(id),
  team1_score int,
  team2_score int,
  winner_team smallint check (winner_team in (1, 2)),
  is_playoff boolean not null default false,
  played_at timestamptz,
  created_at timestamptz not null default now()
);

create index tm_event_id_idx on tournament_matches(event_id);

-- ============================================================
-- PLAYER STATS
-- One row per member per play_type — upserted after each match
-- ============================================================
create table player_stats (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  play_type play_type not null,
  wins int not null default 0,
  losses int not null default 0,
  points_earned int not null default 0,
  points_lost int not null default 0,
  updated_at timestamptz not null default now(),
  unique(member_id, play_type)
);

create index ps_member_id_idx on player_stats(member_id);

-- ============================================================
-- TITLES
-- ============================================================
create table titles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  tournament_event_id uuid not null references tournament_events(id) on delete cascade,
  title_name text not null,
  awarded_at timestamptz not null default now()
);

create index titles_member_id_idx on titles(member_id);

-- ============================================================
-- UPDATED_AT TRIGGER HELPER
-- ============================================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function handle_updated_at();
create trigger clubs_updated_at before update on clubs
  for each row execute function handle_updated_at();
create trigger members_updated_at before update on members
  for each row execute function handle_updated_at();
create trigger open_plays_updated_at before update on open_plays
  for each row execute function handle_updated_at();
create trigger tournaments_updated_at before update on tournaments
  for each row execute function handle_updated_at();
create trigger tournament_events_updated_at before update on tournament_events
  for each row execute function handle_updated_at();
create trigger player_stats_updated_at before update on player_stats
  for each row execute function handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(
      (new.raw_user_meta_data->>'role')::user_role,
      'club_admin'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table clubs enable row level security;
alter table members enable row level security;
alter table open_plays enable row level security;
alter table open_play_participants enable row level security;
alter table open_play_matches enable row level security;
alter table tournaments enable row level security;
alter table tournament_events enable row level security;
alter table tournament_registrations enable row level security;
alter table tournament_matches enable row level security;
alter table player_stats enable row level security;
alter table titles enable row level security;

-- Helper: is the current user a super_admin?
create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer;

-- Helper: does the current user own a club?
create or replace function owns_club(club_id uuid)
returns boolean as $$
  select exists (
    select 1 from clubs
    where id = club_id and admin_id = auth.uid()
  );
$$ language sql security definer;

-- PROFILES
create policy "Users read own profile" on profiles for select
  using (id = auth.uid());
create policy "Super admin reads all profiles" on profiles for select
  using (is_super_admin());
create policy "Users update own profile" on profiles for update
  using (id = auth.uid());

-- CLUBS
create policy "Super admin full access clubs" on clubs for all
  using (is_super_admin());
create policy "Club admin reads own club" on clubs for select
  using (admin_id = auth.uid());
create policy "Club admin updates own club" on clubs for update
  using (admin_id = auth.uid() and status = 'approved');
create policy "Anyone can register a club" on clubs for insert
  with check (admin_id = auth.uid());

-- MEMBERS (scoped to club admin's approved club)
create policy "Club admin manages members" on members for all
  using (owns_club(club_id));

-- OPEN PLAYS
create policy "Club admin manages open plays" on open_plays for all
  using (owns_club(club_id));

-- OPEN PLAY PARTICIPANTS
create policy "Club admin manages open play participants" on open_play_participants for all
  using (
    exists (
      select 1 from open_plays op
      where op.id = open_play_id and owns_club(op.club_id)
    )
  );

-- OPEN PLAY MATCHES
create policy "Club admin manages open play matches" on open_play_matches for all
  using (
    exists (
      select 1 from open_plays op
      where op.id = open_play_id and owns_club(op.club_id)
    )
  );

-- TOURNAMENTS
create policy "Club admin manages tournaments" on tournaments for all
  using (owns_club(club_id));

-- TOURNAMENT EVENTS
create policy "Club admin manages tournament events" on tournament_events for all
  using (
    exists (
      select 1 from tournaments t
      where t.id = tournament_id and owns_club(t.club_id)
    )
  );

-- TOURNAMENT REGISTRATIONS
create policy "Club admin manages tournament registrations" on tournament_registrations for all
  using (
    exists (
      select 1 from tournament_events te
      join tournaments t on t.id = te.tournament_id
      where te.id = event_id and owns_club(t.club_id)
    )
  );

-- TOURNAMENT MATCHES
create policy "Club admin manages tournament matches" on tournament_matches for all
  using (
    exists (
      select 1 from tournament_events te
      join tournaments t on t.id = te.tournament_id
      where te.id = event_id and owns_club(t.club_id)
    )
  );

-- PLAYER STATS
create policy "Club admin reads player stats" on player_stats for select
  using (
    exists (
      select 1 from members m
      where m.id = member_id and owns_club(m.club_id)
    )
  );
create policy "Service role updates player stats" on player_stats for all
  using (true); -- updated via server-side service role only

-- TITLES
create policy "Club admin reads titles" on titles for select
  using (
    exists (
      select 1 from members m
      where m.id = member_id and owns_club(m.club_id)
    )
  );
create policy "Service role manages titles" on titles for all
  using (true);
